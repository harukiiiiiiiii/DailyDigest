import { NextRequest, NextResponse } from "next/server";
import { getSettings } from "@/lib/settings";
import { safeJson } from "@/lib/api-utils";

function joinUrl(base: string, path: string): string {
  return base.replace(/\/+$/, "") + "/" + path.replace(/^\/+/, "");
}

export async function POST(req: NextRequest) {
  const { providerId, modelId, apiKey: directKey, baseUrl: directBaseUrl, sdkType: directSdkType } = await req.json();

  // If caller passes credentials directly, use them (no need to read from file)
  let provider;
  if (directKey && directBaseUrl && directSdkType) {
    provider = { apiKey: directKey, baseUrl: directBaseUrl, sdkType: directSdkType };
  } else {
    const settings = getSettings();
    provider = settings.providers.find((p) => p.id === providerId);
    if (!provider) return NextResponse.json({ error: "Provider not found" }, { status: 404 });
    if (!provider.apiKey || provider.apiKey.startsWith("***")) {
      return NextResponse.json({ error: "请先填写 API Key 并保存" }, { status: 400 });
    }
  }

  const targetModelId = modelId;
  if (!targetModelId) return NextResponse.json({ error: "No models configured" }, { status: 400 });

  const startTime = Date.now();

  try {
    let text = "";

    if (provider.sdkType === "gemini") {
      text = await testGemini(provider.baseUrl, provider.apiKey, targetModelId);
    } else if (provider.sdkType === "anthropic") {
      text = await testAnthropic(provider.baseUrl, provider.apiKey, targetModelId);
    } else {
      text = await testOpenAI(provider.baseUrl, provider.apiKey, targetModelId);
    }

    return NextResponse.json({
      success: true,
      model: targetModelId,
      response: text.slice(0, 50),
      latencyMs: Date.now() - startTime,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({
      error: msg,
      model: targetModelId,
      latencyMs: Date.now() - startTime,
    }, { status: 502 });
  }
}

async function testGemini(baseUrl: string, apiKey: string, modelId: string): Promise<string> {
  const body = JSON.stringify({
    contents: [{ role: "user", parts: [{ text: "Reply with exactly: OK" }] }],
    generationConfig: { maxOutputTokens: 32, temperature: 0 },
  });

  const attempts: Array<{ url: string; headers: Record<string, string> }> = [
    {
      url: joinUrl(baseUrl, `models/${modelId}:generateContent`) + `?key=${apiKey}`,
      headers: { "Content-Type": "application/json" },
    },
    {
      url: joinUrl(baseUrl, `models/${modelId}:generateContent`),
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    },
  ];

  let lastError = "";
  for (const attempt of attempts) {
    try {
      const res = await fetch(attempt.url, {
        method: "POST",
        headers: attempt.headers,
        body,
        signal: AbortSignal.timeout(30000),
      });
      if (!res.ok) {
        const errBody = await res.text();
        lastError = extractErrorMessage(errBody, res.status);
        continue;
      }
      const data = await res.json();

      // Gemini native response
      if (data.candidates) {
        return data.candidates[0]?.content?.parts?.[0]?.text ?? "OK";
      }
      // OpenAI-compatible response from proxy
      if (data.choices) {
        return data.choices[0]?.message?.content ?? "OK";
      }
      return "OK";
    } catch (err) {
      lastError = err instanceof Error ? err.message : String(err);
    }
  }
  throw new Error(lastError || "All attempts failed");
}

async function testAnthropic(baseUrl: string, apiKey: string, modelId: string): Promise<string> {
  const res = await fetch(joinUrl(baseUrl, "messages"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: modelId,
      max_tokens: 32,
      messages: [{ role: "user", content: "Reply with exactly: OK" }],
    }),
    signal: AbortSignal.timeout(30000),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(extractErrorMessage(body, res.status));
  }
  const data = await safeJson(res, "Anthropic");
  return data.content?.[0]?.text ?? "OK";
}

async function testOpenAI(baseUrl: string, apiKey: string, modelId: string): Promise<string> {
  const res = await fetch(joinUrl(baseUrl, "chat/completions"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: modelId,
      messages: [{ role: "user", content: "Reply with exactly: OK" }],
      max_tokens: 32,
      temperature: 0,
    }),
    signal: AbortSignal.timeout(30000),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(extractErrorMessage(body, res.status));
  }
  const data = await safeJson(res, "OpenAI");
  return data.choices?.[0]?.message?.content ?? "OK";
}

function extractErrorMessage(body: string, status: number): string {
  try {
    const parsed = JSON.parse(body);
    return parsed.error?.message ?? parsed.message ?? `HTTP ${status}`;
  } catch {
    return body.slice(0, 200) || `HTTP ${status}`;
  }
}
