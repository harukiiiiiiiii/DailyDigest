/**
 * Doubao (ByteDance / Volcengine) search agent.
 * Search: Built-in web_search tool for Chinese internet coverage.
 */
import type { SearchAgent, SearchContext } from "./base";
import { parseItemsFromText, buildResult } from "./base";
import { getSearchAgentConfig } from "../config";
import { buildSearchPrompt } from "../prompts";
import { safeJson } from "../utils";

function joinUrl(base: string, path: string): string {
  return base.replace(/\/+$/, "") + "/" + path.replace(/^\/+/, "");
}

export class DoubaoAgent implements SearchAgent {
  readonly id = "doubao" as const;
  readonly label = "豆包 (ByteDance)";

  async search(channelPrompt: string, ctx: SearchContext) {
    const cfg = getSearchAgentConfig("doubao", ctx.modelOverrides?.doubao, ctx.channelBindings?.doubao);
    if (!cfg.apiKey) throw new Error("DOUBAO_API_KEY not set");
    const { system, user } = buildSearchPrompt("doubao", channelPrompt, ctx);
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
        tools: [
          {
            type: "web_search",
            web_search: {
              enable: true,
              search_query: `${ctx.channelName} ${ctx.keywords.join(" ")} ${ctx.date}`,
            },
          },
        ],
      }),
      signal: AbortSignal.timeout(cfg.timeoutMs),
    });

    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Doubao API ${res.status}: ${body}`);
    }

    const data = await safeJson(res, "Doubao");
    const content: string = data.choices?.[0]?.message?.content ?? "";
    const usage = {
      inputTokens: data.usage?.prompt_tokens ?? 0,
      outputTokens: data.usage?.completion_tokens ?? 0,
    };

    const items = parseItemsFromText(content);
    return buildResult("doubao", items, usage, cfg, startTime);
  }
}
