/**
 * ReAct Search Agent — multi-turn iterative search using Gemini function calling.
 *
 * Architecture:
 *   1. System prompt defines the search task and available tools
 *   2. Model decides which tools to call (web_search, crawl_url)
 *   3. Tools execute in parallel
 *   4. Results fed back to model
 *   5. Repeat until model outputs final answer or max iterations reached
 *
 * This replaces the old planner + multi-query approach with a single
 * intelligent agent that plans, searches, verifies, and outputs.
 */
import { TOOL_DECLARATIONS, executeToolCalls, type ToolConfig } from "./tools";
import type { RawSearchItem } from "./types";
import type { SearchContext } from "./agents/base";
import { parseItemsFromText } from "./agents/base";

const MAX_ITERATIONS = 6;
const AGENT_TIMEOUT = 180_000; // 3 minutes total

export interface ReactAgentConfig {
  apiKey: string;
  baseUrl: string;
  model: string;
  maxTokens: number;
  toolConfig: ToolConfig;
}

interface ConversationMessage {
  role: "user" | "model";
  parts: any[];
}

export interface ReactAgentResult {
  items: RawSearchItem[];
  iterations: number;
  toolCalls: { name: string; query?: string; url?: string }[];
  totalSearches: number;
  totalCrawls: number;
  usage: { inputTokens: number; outputTokens: number };
}

// ─── System Prompt ─────────────────────────────────────────────

function buildSystemPrompt(ctx: SearchContext, searchPrompt: string): string {
  return `你是一个专业的新闻搜索智能体（Search Agent）。你的任务是为「${ctx.channelName}」频道搜索 ${ctx.date} 的最新新闻和动态。

频道关键词：${ctx.keywords.join(", ")}
搜索提示：${searchPrompt}
推荐来源：${ctx.sources?.join(", ") || "不限"}

## 可用工具

1. **web_search(query)** — 搜索网页，返回真实的搜索结果（标题、URL、摘要）。每次调用会返回一组带有真实 URL 的结果。
2. **crawl_url(url)** — 抓取网页内容。**你必须对重要新闻调用此工具来验证文章确实存在**。

## 工作流程（必须严格遵守）

### 第1轮：广度搜索
- 规划 4-6 个不同维度的搜索查询（中英文各半），一次性并行调用多个 web_search

### 第2轮：验证 + 补充
- 从第1轮搜索结果中选出 5-8 条最重要的新闻
- **对每条新闻调用 crawl_url 验证其 URL 确实可访问且内容匹配**
- 如果某个维度信息不足，补充搜索

### 第3轮（如需）：补充验证
- 对剩余未验证的重要新闻继续 crawl

### 最后：输出结果
- **只输出 crawl_url 验证成功的新闻**
- 输出 JSON 数组

## 输出格式

直接输出 JSON 数组（不要代码块包裹）：
[
  {
    "title": "新闻标题",
    "summary": "150-200字摘要，包含具体数据和关键信息",
    "source": "来源名称（从 crawl 获取的页面标题或域名提取）",
    "url": "必须是 web_search 返回的原始 URL，原封不动复制",
    "relevance": "为什么这条新闻对本频道重要"
  }
]

## ⚠️ 关键规则（违反将导致输出无效）

1. **URL 来源**：每条结果的 url 字段必须**原封不动**复制自 web_search 返回的 results 数组中的 url。严禁自行拼接、修改或猜测 URL。
2. **必须验证**：在最终输出前，至少对 5 条最重要的新闻调用 crawl_url。crawl 返回 success=false 的新闻不要包含在最终结果中。
3. **禁止编造**：不要报道 web_search 结果中没有出现的新闻。如果搜索不到某类信息，就不要编造。
4. **最终输出**：8-15 条经过验证的高质量结果。宁可少输出几条，也不要包含未验证的内容。`;
}

// ─── Gemini API Call ───────────────────────────────────────────

function joinUrl(base: string, p: string): string {
  return base.replace(/\/+$/, "") + "/" + p.replace(/^\/+/, "");
}

const MAX_RETRIES = 3;
const RETRY_DELAYS = [3_000, 8_000, 15_000];

async function callGemini(
  cfg: ReactAgentConfig,
  systemPrompt: string,
  history: ConversationMessage[],
): Promise<any> {
  const endpoint = joinUrl(cfg.baseUrl, `models/${cfg.model}:generateContent`);
  const isGoogleKey = cfg.apiKey.startsWith("AIza");
  const url = isGoogleKey
    ? `${endpoint}?key=${cfg.apiKey}`
    : endpoint;

  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (!isGoogleKey) {
    headers["x-goog-api-key"] = cfg.apiKey;
  }

  const body: any = {
    system_instruction: { parts: [{ text: systemPrompt }] },
    contents: history,
    tools: TOOL_DECLARATIONS,
    tool_config: {
      function_calling_config: { mode: "AUTO" },
    },
    generationConfig: {
      maxOutputTokens: cfg.maxTokens,
      temperature: 0.3,
    },
  };

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const res = await fetch(url, {
        method: "POST",
        headers,
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(90_000),
      });

      if (res.status === 503 || res.status === 429) {
        if (attempt < MAX_RETRIES) {
          const delay = RETRY_DELAYS[attempt] ?? 15_000;
          console.log(`      [retry] ${res.status}, waiting ${delay / 1000}s (attempt ${attempt + 1}/${MAX_RETRIES})`);
          await new Promise((r) => setTimeout(r, delay));
          continue;
        }
      }

      if (!res.ok) {
        const text = await res.text();
        throw new Error(`Gemini ${res.status}: ${text.slice(0, 300)}`);
      }

      return await res.json();
    } catch (e) {
      if (attempt < MAX_RETRIES && e instanceof Error && (e.message.includes("503") || e.message.includes("timeout") || e.message.includes("aborted"))) {
        const delay = RETRY_DELAYS[attempt] ?? 15_000;
        console.log(`      [retry] ${e.message.slice(0, 50)}, waiting ${delay / 1000}s (attempt ${attempt + 1}/${MAX_RETRIES})`);
        await new Promise((r) => setTimeout(r, delay));
        continue;
      }
      throw e;
    }
  }
  throw new Error("Gemini: max retries exceeded");
}

/**
 * Call Gemini WITHOUT tools to force text output (final answer).
 * Includes same retry logic as callGemini.
 */
async function callGeminiNoTools(
  cfg: ReactAgentConfig,
  systemPrompt: string,
  history: ConversationMessage[],
): Promise<any> {
  const endpoint = joinUrl(cfg.baseUrl, `models/${cfg.model}:generateContent`);
  const isGoogleKey = cfg.apiKey.startsWith("AIza");
  const url = isGoogleKey
    ? `${endpoint}?key=${cfg.apiKey}`
    : endpoint;

  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (!isGoogleKey) {
    headers["x-goog-api-key"] = cfg.apiKey;
  }

  const body = JSON.stringify({
    system_instruction: { parts: [{ text: systemPrompt }] },
    contents: history,
    generationConfig: {
      maxOutputTokens: cfg.maxTokens,
      temperature: 0.2,
    },
  });

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const res = await fetch(url, {
        method: "POST",
        headers,
        body,
        signal: AbortSignal.timeout(90_000),
      });

      if (res.status === 503 || res.status === 429) {
        if (attempt < MAX_RETRIES) {
          const delay = RETRY_DELAYS[attempt] ?? 15_000;
          console.log(`      [retry] ${res.status}, waiting ${delay / 1000}s (attempt ${attempt + 1}/${MAX_RETRIES})`);
          await new Promise((r) => setTimeout(r, delay));
          continue;
        }
      }

      if (!res.ok) {
        const text = await res.text();
        throw new Error(`Gemini (no-tools) ${res.status}: ${text.slice(0, 300)}`);
      }

      return await res.json();
    } catch (e) {
      if (attempt < MAX_RETRIES && e instanceof Error && (e.message.includes("503") || e.message.includes("timeout") || e.message.includes("aborted"))) {
        const delay = RETRY_DELAYS[attempt] ?? 15_000;
        console.log(`      [retry] ${e.message.slice(0, 50)}, waiting ${delay / 1000}s (attempt ${attempt + 1}/${MAX_RETRIES})`);
        await new Promise((r) => setTimeout(r, delay));
        continue;
      }
      throw e;
    }
  }
  throw new Error("Gemini (no-tools): max retries exceeded");
}

// ─── Main ReAct Loop ───────────────────────────────────────────

export async function runReactAgent(
  ctx: SearchContext,
  searchPrompt: string,
  cfg: ReactAgentConfig,
): Promise<ReactAgentResult> {
  const systemPrompt = buildSystemPrompt(ctx, searchPrompt);
  const history: ConversationMessage[] = [];
  const allToolCalls: ReactAgentResult["toolCalls"] = [];
  let totalInput = 0;
  let totalOutput = 0;
  let totalSearches = 0;
  let totalCrawls = 0;
  const startTime = Date.now();

  // Initial user message
  history.push({
    role: "user",
    parts: [
      {
        text: `请开始搜索 ${ctx.date} 的「${ctx.channelName}」频道最新动态。先规划搜索维度，然后一次性调用多个 web_search。`,
      },
    ],
  });

  for (let iteration = 0; iteration < MAX_ITERATIONS; iteration++) {
    if (Date.now() - startTime > AGENT_TIMEOUT) {
      console.log(`    [react] ⏰ timeout at iteration ${iteration + 1}`);
      break;
    }

    // Call Gemini
    const data = await callGemini(cfg, systemPrompt, history);
    const candidate = data.candidates?.[0];
    const parts = candidate?.content?.parts ?? [];
    const meta = data.usageMetadata ?? {};
    totalInput += meta.promptTokenCount ?? 0;
    totalOutput += meta.candidatesTokenCount ?? 0;

    // Separate function calls from text
    const functionCalls = parts.filter((p: any) => p.functionCall);
    const textParts = parts.filter((p: any) => p.text);

    if (functionCalls.length === 0) {
      // No more tool calls — model is done, extract final output
      const finalText = textParts.map((p: any) => p.text).join("");
      console.log(
        `    [react] iteration ${iteration + 1}: final output (${finalText.length} chars)`,
      );
      if (finalText.length < 50 || !finalText.includes("[")) {
        console.log(`    [react] ⚠ final text preview: ${finalText.slice(0, 500)}`);
      }

      history.push({ role: "model", parts });

      const items = parseItemsFromText(finalText);
      return {
        items,
        iterations: iteration + 1,
        toolCalls: allToolCalls,
        totalSearches,
        totalCrawls,
        usage: { inputTokens: totalInput, outputTokens: totalOutput },
      };
    }

    // Log thinking text if any
    if (textParts.length > 0) {
      const thinkText = textParts
        .map((p: any) => p.text)
        .join("")
        .slice(0, 200);
      console.log(
        `    [react] iteration ${iteration + 1}: ${thinkText.replace(/\n/g, " ")}`,
      );
    } else {
      console.log(`    [react] iteration ${iteration + 1}: calling ${functionCalls.length} tools`);
    }

    // Add model response to history
    history.push({ role: "model", parts });

    // Extract tool calls
    const calls = functionCalls.map((p: any) => ({
      name: p.functionCall.name as string,
      args: (p.functionCall.args ?? {}) as Record<string, unknown>,
    }));

    // Log each tool call
    for (const c of calls) {
      if (c.name === "web_search") {
        totalSearches++;
        console.log(`      🔍 web_search: "${c.args.query}"`);
        allToolCalls.push({ name: c.name, query: c.args.query as string });
      } else if (c.name === "crawl_url") {
        totalCrawls++;
        const urlStr = (c.args.url as string) || "";
        console.log(`      📄 crawl_url: ${urlStr.slice(0, 80)}`);
        allToolCalls.push({ name: c.name, url: urlStr });
      }
    }

    // Execute all tool calls in parallel
    const results = await executeToolCalls(calls, cfg.toolConfig);

    // Log results summary
    for (const r of results) {
      const res = r.result as any;
      if (r.name === "web_search") {
        console.log(`      ✓ ${r.name}: ${res.count ?? 0} results`);
      } else if (r.name === "crawl_url") {
        const ok = res.success ? "✓" : "✗";
        console.log(
          `      ${ok} ${r.name}: ${res.title?.slice(0, 50) || res.url?.slice(0, 50) || "?"} (${res.statusCode ?? "err"})`,
        );
      }
    }

    // Build function response parts — truncate crawl content to prevent context overflow
    const responseParts = results.map((r) => {
      let result = r.result;
      if (r.name === "crawl_url" && result && typeof result === "object") {
        const cr = result as Record<string, unknown>;
        if (typeof cr.content === "string" && cr.content.length > 1500) {
          result = { ...cr, content: cr.content.slice(0, 1500) + "\n[...truncated]" };
        }
      }
      return {
        functionResponse: {
          name: r.name,
          response: result,
        },
      };
    });

    history.push({ role: "user", parts: responseParts });
  }

  // Max iterations reached — force final output without tools
  console.log(
    `    [react] max iterations (${MAX_ITERATIONS}) reached, forcing final output`,
  );

  history.push({
    role: "user",
    parts: [
      {
        text: "已达到最大搜索轮次。请立即基于已收集的所有信息输出最终的 JSON 数组结果。只输出 JSON，不要调用任何工具。",
      },
    ],
  });

  const finalData = await callGeminiNoTools(cfg, systemPrompt, history);
  const finalCandidate = finalData.candidates?.[0];
  const finalText = (finalCandidate?.content?.parts ?? [])
    .filter((p: any) => p.text)
    .map((p: any) => p.text)
    .join("");

  console.log(`    [react] forced output (${finalText.length} chars)`);
  if (finalText.length < 50 || !finalText.includes("[")) {
    console.log(`    [react] ⚠ final text preview: ${finalText.slice(0, 1000)}`);
  }

  const finalMeta = finalData.usageMetadata ?? {};
  totalInput += finalMeta.promptTokenCount ?? 0;
  totalOutput += finalMeta.candidatesTokenCount ?? 0;

  return {
    items: parseItemsFromText(finalText),
    iterations: MAX_ITERATIONS + 1,
    toolCalls: allToolCalls,
    totalSearches,
    totalCrawls,
    usage: { inputTokens: totalInput, outputTokens: totalOutput },
  };
}
