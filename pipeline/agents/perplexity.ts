/**
 * Perplexity search agent.
 * Every call is a web search — search_recency_filter limits to recent results.
 */
import type { SearchAgent, SearchContext } from "./base";
import { parseItemsFromText, buildResult } from "./base";
import { getSearchAgentConfig } from "../config";
import { buildSearchPrompt } from "../prompts";
import { safeJson } from "../utils";

function joinUrl(base: string, path: string): string {
  return base.replace(/\/+$/, "") + "/" + path.replace(/^\/+/, "");
}

export class PerplexityAgent implements SearchAgent {
  readonly id = "perplexity" as const;
  readonly label = "Perplexity";

  async search(channelPrompt: string, ctx: SearchContext) {
    const cfg = getSearchAgentConfig("perplexity", ctx.modelOverrides?.perplexity, ctx.channelBindings?.perplexity);
    if (!cfg.apiKey) throw new Error("PERPLEXITY_API_KEY not set");
    const { system, user } = buildSearchPrompt("perplexity", channelPrompt, ctx);
    const startTime = Date.now();

    const res = await fetch(joinUrl(cfg.baseUrl, "chat/completions"), {
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
        temperature: 0.3,
        search_recency_filter: "day",
      }),
      signal: AbortSignal.timeout(cfg.timeoutMs),
    });

    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Perplexity API ${res.status}: ${body}`);
    }

    const data = await safeJson(res, "Perplexity");
    const content: string = data.choices?.[0]?.message?.content ?? "";
    const citations: string[] = data.citations ?? [];
    const usage = {
      inputTokens: data.usage?.prompt_tokens ?? 0,
      outputTokens: data.usage?.completion_tokens ?? 0,
    };

    let items = parseItemsFromText(content);
    if (citations.length > 0) {
      items = items.map((item, i) => ({
        ...item,
        url: item.url && item.url !== "#" ? item.url : citations[i] ?? item.url,
      }));
    }

    return buildResult("perplexity", items, usage, cfg, startTime);
  }
}
