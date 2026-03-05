/**
 * Query Planner — Phase 1 of the improved search layer.
 *
 * Decomposes a channel's broad topic into 4-6 targeted sub-queries,
 * each covering a different dimension (e.g., product launches, policy,
 * research, industry deals). Supports bilingual (zh/en) queries for
 * broader coverage.
 */
import { getSearchAgentConfig } from "./config";
import type { SearchAgentId } from "./types";

export interface SubQuery {
  query: string;
  lang: "zh" | "en";
  dimension: string;
}

export interface SearchPlan {
  subQueries: SubQuery[];
  durationMs: number;
  costUsd: number;
}

// ─── Planner prompt ────────────────────────────────────────────
function buildPlannerPrompt(input: {
  channelName: string;
  channelDescription: string;
  searchPrompt: string;
  keywords: string[];
  sources: string[];
  date: string;
}): { system: string; user: string } {
  const system = `你是一个搜索策略规划专家。你的任务是将一个宽泛的新闻频道主题分解为多个精准、有针对性的搜索子查询。

规则：
- 生成 4-6 个子查询，每个覆盖不同的维度/角度
- 中英文各占约一半，以获取更广泛的信息覆盖
- 英文查询适合搜索国际媒体、学术论文、行业报告
- 中文查询适合搜索国内媒体、政策法规、中文社区讨论
- 每个查询要具体、有时效性（包含日期或"最新""today"等词）
- 查询应互补，尽量不要重叠
- 直接输出 JSON，不要代码块`;

  const user = `频道：${input.channelName}
描述：${input.channelDescription}
搜索提示：${input.searchPrompt}
关键词：${input.keywords.join("、")}
推荐来源：${input.sources.join("、")}
日期：${input.date}

请输出如下 JSON（不要代码块）：
[
  { "query": "具体搜索查询文本", "lang": "en", "dimension": "维度名称" },
  { "query": "具体搜索查询文本", "lang": "zh", "dimension": "维度名称" }
]`;

  return { system, user };
}

// ─── Call the planner model ────────────────────────────────────
function joinUrl(base: string, p: string): string {
  return base.replace(/\/+$/, "") + "/" + p.replace(/^\/+/, "");
}

export async function planQueries(input: {
  channelName: string;
  channelDescription: string;
  searchPrompt: string;
  keywords: string[];
  sources: string[];
  date: string;
  agent?: SearchAgentId;
}): Promise<SearchPlan> {
  const startTime = Date.now();
  const agent = input.agent ?? "gemini";
  const cfg = getSearchAgentConfig(agent);

  const { system, user } = buildPlannerPrompt(input);
  const endpoint = joinUrl(cfg.baseUrl, `models/${cfg.model}:generateContent`);

  const isGoogleKey = cfg.apiKey.startsWith("AIza");
  const headers: Record<string, string> = isGoogleKey
    ? { "Content-Type": "application/json", "x-goog-api-key": cfg.apiKey }
    : { "Content-Type": "application/json", Authorization: `Bearer ${cfg.apiKey}` };
  const url = isGoogleKey ? endpoint : endpoint + `?key=${cfg.apiKey}`;

  const res = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify({
      system_instruction: { parts: [{ text: system }] },
      contents: [{ role: "user", parts: [{ text: user }] }],
      generationConfig: { maxOutputTokens: 2048, temperature: 0.4 },
    }),
    signal: AbortSignal.timeout(30_000),
  });

  if (!res.ok) {
    const errBody = await res.text().catch(() => "");
    throw new Error(`Planner API ${res.status}: ${errBody.slice(0, 150)}`);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const data: any = await res.json();
  const text = (data.candidates?.[0]?.content?.parts ?? [])
    .filter((p: { text?: string }) => p.text)
    .map((p: { text: string }) => p.text)
    .join("");

  const meta = data.usageMetadata ?? {};
  const costUsd =
    ((meta.promptTokenCount ?? 0) / 1_000_000) * cfg.inputPricePer1M +
    ((meta.candidatesTokenCount ?? 0) / 1_000_000) * cfg.outputPricePer1M;

  const subQueries = parseSubQueries(text);
  const durationMs = Date.now() - startTime;

  return { subQueries, durationMs, costUsd };
}

// ─── Parse model output into SubQuery[] ────────────────────────
function parseSubQueries(text: string): SubQuery[] {
  const fenceMatch = text.match(/```(?:json)?\s*\n?([\s\S]*?)```/);
  const raw = fenceMatch ? fenceMatch[1].trim() : text.trim();

  const arrStart = raw.indexOf("[");
  const arrEnd = raw.lastIndexOf("]");
  if (arrStart === -1 || arrEnd <= arrStart) return [];

  try {
    const parsed = JSON.parse(raw.slice(arrStart, arrEnd + 1));
    if (!Array.isArray(parsed) || parsed.length === 0) return [];

    return parsed
      .filter((item: Record<string, unknown>) => item && typeof item.query === "string")
      .map((item: Record<string, unknown>) => ({
        query: String(item.query),
        lang: item.lang === "en" ? "en" as const : "zh" as const,
        dimension: String(item.dimension ?? "综合"),
      }));
  } catch {
    return [];
  }
}
