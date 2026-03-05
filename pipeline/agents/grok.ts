/**
 * Grok (xAI) search agent.
 * Search: Built-in live search via search_parameters.
 */
import type { SearchAgent, SearchContext } from "./base";
import { parseItemsFromText, buildResult } from "./base";
import { getSearchAgentConfig } from "../config";
import { buildSearchPrompt } from "../prompts";
import { safeJson } from "../utils";

function joinUrl(base: string, path: string): string {
  return base.replace(/\/+$/, "") + "/" + path.replace(/^\/+/, "");
}

export class GrokAgent implements SearchAgent {
  readonly id = "grok" as const;
  readonly label = "Grok (xAI)";

  async search(channelPrompt: string, ctx: SearchContext) {
    const cfg = getSearchAgentConfig("grok", ctx.modelOverrides?.grok, ctx.channelBindings?.grok);
    if (!cfg.apiKey) throw new Error("XAI_API_KEY not set");
    const { system, user } = buildSearchPrompt("grok", channelPrompt, ctx);
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
        search_parameters: {
          mode: "auto",
          return_citations: true,
          from_date: ctx.date,
        },
      }),
      signal: AbortSignal.timeout(cfg.timeoutMs),
    });

    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Grok API ${res.status}: ${body}`);
    }

    const data = await safeJson(res, "Grok");
    const content: string = data.choices?.[0]?.message?.content ?? "";
    const usage = {
      inputTokens: data.usage?.prompt_tokens ?? 0,
      outputTokens: data.usage?.completion_tokens ?? 0,
    };

    const items = parseItemsFromText(content);
    return buildResult("grok", items, usage, cfg, startTime);
  }
}
