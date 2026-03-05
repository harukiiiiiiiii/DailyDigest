/**
 * Layer 2: Integration layer.
 * Takes raw search results from multiple agents and produces a final DailyDigest.
 * Uses Claude (Anthropic) or DeepSeek as the integration model.
 */
import type {
  IntegrationModelId,
  AgentSearchResult,
  DailyDigest,
} from "./types";
import { getIntegrationConfig, calcCost } from "./config";
import { buildIntegrationPrompt } from "./prompts";
import { safeJson, openaiUrl } from "./utils";

const MAX_RETRIES = 2;

interface IntegrateOptions {
  channelId: string;
  channelName: string;
  channelDescription: string;
  date: string;
  weekday: string;
  searchPrompt: string;
  model: IntegrationModelId;
  modelOverride?: string;
  channelBinding?: { providerId: string; modelId: string };
  agentResults: AgentSearchResult[];
  maxArticles?: number;
}

interface IntegrateResult {
  digest: DailyDigest;
  costUsd: number;
  durationMs: number;
}

export async function integrate(opts: IntegrateOptions): Promise<IntegrateResult> {
  const cfg = getIntegrationConfig(opts.model, opts.modelOverride, opts.channelBinding);
  if (!cfg.apiKey) {
    throw new Error(`API key not set for integration model: ${opts.model}`);
  }

  const { system, user } = buildIntegrationPrompt({
    channelName: opts.channelName,
    channelDescription: opts.channelDescription,
    channelId: opts.channelId,
    date: opts.date,
    weekday: opts.weekday,
    searchPrompt: opts.searchPrompt,
    rawResults: opts.agentResults.map((r) => ({
      agent: r.agent,
      items: r.items as unknown as Array<Record<string, string>>,
    })),
    maxArticles: opts.maxArticles,
  });

  // Route by sdkType (from settings.json), not by model name string
  const sdk = cfg.sdkType ?? (opts.model.startsWith("claude") ? "anthropic" : opts.model === "gemini" ? "gemini" : "openai");

  let lastError: Error | null = null;
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    const startTime = Date.now();
    try {
      const { content, usage } = sdk === "gemini"
        ? await callGeminiWithFallback(cfg, system, user)
        : sdk === "anthropic"
          ? await callAnthropic(cfg, system, user)
          : await callOpenAICompat(cfg, system, user);

      const digest = parseDigestJson(content, opts);
      const costUsd = calcCost(usage, cfg);

      console.log(
        `  ✓ Integration (${opts.model}): ` +
        `${digest.articles.length} articles, $${costUsd.toFixed(4)}, ${Date.now() - startTime}ms`,
      );

      return { digest, costUsd, durationMs: Date.now() - startTime };
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      if (attempt < MAX_RETRIES) {
        console.warn(`  ⟳ Integration retry ${attempt + 1}/${MAX_RETRIES}: ${lastError.message}`);
      }
    }
  }

  throw lastError ?? new Error("Integration failed");
}

// ─── Gemini Generative Language API ────────────────────────────
function joinUrl(base: string, path: string): string {
  return base.replace(/\/+$/, "") + "/" + path.replace(/^\/+/, "");
}

async function callGeminiWithFallback(
  cfg: ReturnType<typeof getIntegrationConfig>,
  system: string,
  user: string,
) {
  // Try Gemini native format first
  try {
    return await callGeminiNative(cfg, system, user);
  } catch {
    // Fall back to OpenAI-compatible format (for proxies)
    return await callOpenAICompat(cfg, system, user);
  }
}

async function callGeminiNative(
  cfg: ReturnType<typeof getIntegrationConfig>,
  system: string,
  user: string,
) {
  const endpoint = joinUrl(cfg.baseUrl, `models/${cfg.model}:generateContent`);
  const body = JSON.stringify({
    system_instruction: { parts: [{ text: system }] },
    contents: [{ role: "user", parts: [{ text: user }] }],
    generationConfig: {
      maxOutputTokens: cfg.maxTokens,
      temperature: 0.2,
    },
  });

  const isGoogleKey = cfg.apiKey.startsWith("AIza");
  const attempts: Array<{ url: string; headers: Record<string, string> }> = isGoogleKey
    ? [
        { url: endpoint, headers: { "Content-Type": "application/json", "x-goog-api-key": cfg.apiKey } },
      ]
    : [
        { url: endpoint + `?key=${cfg.apiKey}`, headers: { "Content-Type": "application/json" } },
        { url: endpoint, headers: { "Content-Type": "application/json", Authorization: `Bearer ${cfg.apiKey}` } },
      ];

  let lastError = "";
  for (const attempt of attempts) {
    try {
      const res = await fetch(attempt.url, {
        method: "POST",
        headers: attempt.headers,
        body,
        signal: AbortSignal.timeout(cfg.timeoutMs),
      });
      const contentType = res.headers.get("content-type") ?? "";
      if (!res.ok || !contentType.includes("json")) {
        lastError = `Gemini API ${res.status} (${contentType.split(";")[0]}): ${(await res.text()).slice(0, 150)}`;
        continue;
      }
      const data = await res.json();
      const parts: Array<{ text?: string }> =
        data.candidates?.[0]?.content?.parts ?? [];
      const content = parts.map((p) => p.text ?? "").join("");
      const meta = data.usageMetadata ?? {};
      const usage = {
        inputTokens: meta.promptTokenCount ?? 0,
        outputTokens: meta.candidatesTokenCount ?? 0,
      };
      return { content, usage };
    } catch (err) {
      lastError = err instanceof Error ? err.message : String(err);
    }
  }
  throw new Error(lastError);
}

async function callOpenAICompat(
  cfg: ReturnType<typeof getIntegrationConfig>,
  system: string,
  user: string,
) {
  const url = openaiUrl(cfg.baseUrl);
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${cfg.apiKey}`,
    },
    body: JSON.stringify({
      model: cfg.model,
      messages: [
        ...(system ? [{ role: "system", content: system }] : []),
        { role: "user", content: user },
      ],
      max_tokens: cfg.maxTokens,
      temperature: 0.2,
    }),
    signal: AbortSignal.timeout(cfg.timeoutMs),
  });
  const data = await safeJson(res, "OpenAI-compat");
  return {
    content: data.choices?.[0]?.message?.content ?? "" as string,
    usage: {
      inputTokens: data.usage?.prompt_tokens ?? 0,
      outputTokens: data.usage?.completion_tokens ?? 0,
    },
  };
}

// ─── Anthropic Messages API ────────────────────────────────────
async function callAnthropic(
  cfg: ReturnType<typeof getIntegrationConfig>,
  system: string,
  user: string,
) {
  const res = await fetch(`${cfg.baseUrl}/messages`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": cfg.apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: cfg.model,
      max_tokens: cfg.maxTokens,
      system,
      messages: [{ role: "user", content: user }],
      temperature: 0.2,
    }),
    signal: AbortSignal.timeout(cfg.timeoutMs),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Anthropic API ${res.status}: ${body}`);
  }

  const data = await safeJson(res, "Anthropic");
  const content: string =
    data.content
      ?.filter((b: { type: string }) => b.type === "text")
      .map((b: { text: string }) => b.text)
      .join("") ?? "";
  const usage = {
    inputTokens: data.usage?.input_tokens ?? 0,
    outputTokens: data.usage?.output_tokens ?? 0,
  };
  return { content, usage };
}

// ─── DeepSeek Chat Completions API (OpenAI-compatible) ─────────
async function callDeepSeek(
  cfg: ReturnType<typeof getIntegrationConfig>,
  system: string,
  user: string,
) {
  const res = await fetch(openaiUrl(cfg.baseUrl), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${cfg.apiKey}`,
    },
    body: JSON.stringify({
      model: cfg.model,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      max_tokens: cfg.maxTokens,
      temperature: 0.2,
    }),
    signal: AbortSignal.timeout(cfg.timeoutMs),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`DeepSeek API ${res.status}: ${body}`);
  }

  const data = await safeJson(res, "DeepSeek");
  const content: string = data.choices?.[0]?.message?.content ?? "";
  const usage = {
    inputTokens: data.usage?.prompt_tokens ?? 0,
    outputTokens: data.usage?.completion_tokens ?? 0,
  };
  return { content, usage };
}

// ─── Parse + validate the DailyDigest JSON from model output ───
function parseDigestJson(raw: string, opts: IntegrateOptions): DailyDigest {
  let cleaned = raw.trim();

  // strip markdown fences
  const fenceMatch = cleaned.match(/```(?:json)?\s*\n?([\s\S]*?)```/);
  if (fenceMatch) cleaned = fenceMatch[1].trim();

  // find outermost JSON object
  const objStart = cleaned.indexOf("{");
  const objEnd = cleaned.lastIndexOf("}");
  if (objStart === -1 || objEnd <= objStart) {
    throw new Error("No JSON object found in integration output");
  }
  cleaned = cleaned.slice(objStart, objEnd + 1);

  const parsed = JSON.parse(cleaned);

  // validate required fields
  if (!parsed.articles || !Array.isArray(parsed.articles)) {
    throw new Error("Integration output missing 'articles' array");
  }
  if (parsed.articles.length === 0) {
    throw new Error("Integration output has empty 'articles' array");
  }

  // ensure required fields have fallbacks
  return {
    date: parsed.date ?? opts.date,
    weekday: parsed.weekday ?? opts.weekday,
    channel: parsed.channel ?? opts.channelId,
    topic: parsed.topic ?? "",
    digest: parsed.digest ?? "",
    articles: parsed.articles.map((a: Record<string, unknown>) => ({
      title: a.title ?? "",
      summary: a.summary ?? "",
      source: a.source ?? "",
      sourceAgents: Array.isArray(a.sourceAgents) ? a.sourceAgents : [],
      verified: Boolean(a.verified),
      importance: typeof a.importance === "number" ? a.importance : 0.5,
      tags: Array.isArray(a.tags) ? a.tags : [],
      image: a.image ?? "",
      url: a.url ?? "",
      context: a.context ?? "",
    })),
    meta: {
      agents_used: opts.agentResults.map((r) => r.agent),
      total_raw: opts.agentResults.reduce((s, r) => s + r.items.length, 0),
      after_dedup: parsed.articles.length,
      final_selected: parsed.articles.length,
      generated_at: new Date().toISOString(),
      cost_usd: 0, // filled by runner
    },
  };
}
