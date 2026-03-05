/**
 * Gemini search agent — ReAct mode.
 *
 * Uses multi-turn function calling with web_search + crawl_url tools.
 * The agent autonomously plans queries, searches, verifies URLs, and
 * outputs structured results with real (not hallucinated) URLs.
 *
 * Fallback: OpenAI-compatible proxy if sdkType !== "gemini".
 */
import type { SearchAgent, SearchContext } from "./base";
import { parseItemsFromText, buildResult } from "./base";
import { getSearchAgentConfig } from "../config";
import { openaiUrl, safeJson } from "../utils";
import { buildSearchPrompt } from "../prompts";
import { runReactAgent, type ReactAgentConfig } from "../react-agent";

export class GeminiAgent implements SearchAgent {
  readonly id = "gemini" as const;
  readonly label = "Gemini (Google)";

  async search(channelPrompt: string, ctx: SearchContext) {
    const cfg = getSearchAgentConfig(
      "gemini",
      ctx.modelOverrides?.gemini,
      ctx.channelBindings?.gemini,
    );
    if (!cfg.apiKey) throw new Error("GEMINI_API_KEY not set");
    const startTime = Date.now();

    if (cfg.sdkType === "gemini") {
      return this.searchReact(cfg, ctx, channelPrompt, startTime);
    }

    // Fallback for OpenAI-compatible proxies
    const { system, user } = buildSearchPrompt("gemini", channelPrompt, ctx);
    return this.searchOpenAI(cfg, system, user, startTime);
  }

  /** ReAct mode — multi-turn iterative search with function calling */
  private async searchReact(
    cfg: import("../config").AgentApiConfig,
    ctx: SearchContext,
    channelPrompt: string,
    startTime: number,
  ) {
    const serperKey = process.env.SERPER_API_KEY || "";

    const reactCfg: ReactAgentConfig = {
      apiKey: cfg.apiKey,
      baseUrl: cfg.baseUrl,
      model: cfg.model,
      maxTokens: cfg.maxTokens,
      toolConfig: {
        geminiApiKey: cfg.apiKey,
        geminiBaseUrl: cfg.baseUrl,
        // geminiModel intentionally omitted — search uses stable gemini-2.5-flash for grounding
        serperApiKey: serperKey || undefined,
      },
    };

    const result = await runReactAgent(ctx, channelPrompt, reactCfg);

    console.log(
      `    [react] summary: ${result.iterations} iterations, ` +
        `${result.totalSearches} searches, ${result.totalCrawls} crawls, ` +
        `${result.items.length} items`,
    );

    return buildResult(
      "gemini",
      result.items,
      result.usage,
      cfg,
      startTime,
    );
  }

  /** OpenAI-compatible — proxies */
  private async searchOpenAI(
    cfg: import("../config").AgentApiConfig,
    system: string,
    user: string,
    startTime: number,
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
        temperature: 0.3,
      }),
      signal: AbortSignal.timeout(cfg.timeoutMs),
    });
    const data = await safeJson(res, "Gemini(OpenAI)");
    const items = parseItemsFromText(
      data.choices?.[0]?.message?.content ?? "",
    );
    return buildResult(
      "gemini",
      items,
      {
        inputTokens: data.usage?.prompt_tokens ?? 0,
        outputTokens: data.usage?.completion_tokens ?? 0,
      },
      cfg,
      startTime,
    );
  }
}
