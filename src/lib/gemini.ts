import { getSettings } from "./settings";
import { openaiUrl } from "./api-utils";

function joinUrl(base: string, path: string): string {
  return base.replace(/\/+$/, "") + "/" + path.replace(/^\/+/, "");
}

interface GeminiCallOptions {
  system?: string;
  user: string;
  maxOutputTokens?: number;
  temperature?: number;
}

/**
 * Call Gemini using settings from settings.json.
 * Routes by sdkType: "gemini" → native API, anything else → OpenAI-compatible.
 */
export async function callGemini(opts: GeminiCallOptions): Promise<string> {
  const settings = getSettings();
  const google = settings.providers.find((p) => p.id === "google" && p.apiKey);

  const apiKey = google?.apiKey || process.env.GEMINI_API_KEY || "";
  const baseUrl = google?.baseUrl || "https://generativelanguage.googleapis.com/v1beta";
  const model = google?.models?.[0]?.id || process.env.GEMINI_MODEL || "gemini-2.5-flash";
  const sdkType = google?.sdkType ?? "gemini";

  if (!apiKey) throw new Error("Gemini API Key 未配置");

  if (sdkType === "gemini") {
    return await callGeminiNative(baseUrl, apiKey, model, opts);
  }
  return await callOpenAICompat(baseUrl, apiKey, model, opts);
}

async function callGeminiNative(
  baseUrl: string, apiKey: string, model: string, opts: GeminiCallOptions,
): Promise<string> {
  const endpoint = joinUrl(baseUrl, `models/${model}:generateContent`);
  const bodyParts: Record<string, unknown> = {
    contents: [{ role: "user", parts: [{ text: opts.user }] }],
    generationConfig: {
      maxOutputTokens: opts.maxOutputTokens ?? 16384,
      temperature: opts.temperature ?? 0.4,
    },
  };
  if (opts.system) {
    bodyParts.system_instruction = { parts: [{ text: opts.system }] };
  }
  const body = JSON.stringify(bodyParts);

  const attempts: Array<{ url: string; headers: Record<string, string> }> = [
    { url: endpoint + `?key=${apiKey}`, headers: { "Content-Type": "application/json" } },
    { url: endpoint, headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` } },
  ];

  let lastError = "";
  for (const attempt of attempts) {
    try {
      const res = await fetch(attempt.url, { method: "POST", headers: attempt.headers, body });
      const ct = res.headers.get("content-type") ?? "";
      if (!res.ok || !ct.includes("json")) {
        lastError = `Gemini ${res.status}`;
        continue;
      }
      const data = await res.json();
      return data.candidates?.[0]?.content?.parts
        ?.filter((p: { text?: string }) => p.text)
        .map((p: { text: string }) => p.text)
        .join("") ?? "";
    } catch (err) {
      lastError = err instanceof Error ? err.message : String(err);
    }
  }
  throw new Error(lastError);
}

async function callOpenAICompat(
  baseUrl: string, apiKey: string, model: string, opts: GeminiCallOptions,
): Promise<string> {
  const url = openaiUrl(baseUrl);
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        ...(opts.system ? [{ role: "system", content: opts.system }] : []),
        { role: "user", content: opts.user },
      ],
      max_tokens: opts.maxOutputTokens ?? 16384,
      temperature: opts.temperature ?? 0.4,
    }),
  });
  const ct = res.headers.get("content-type") ?? "";
  if (!res.ok || !ct.includes("json")) {
    throw new Error(`OpenAI-compat ${res.status} (${ct.split(";")[0]}): ${(await res.text()).slice(0, 150)}`);
  }
  const data = await res.json();
  return data.choices?.[0]?.message?.content ?? "";
}
