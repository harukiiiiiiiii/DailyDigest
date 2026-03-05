import type { SearchAgentId } from "./types";
import type { SearchContext } from "./agents/base";

/**
 * Shared output format instruction appended to every search agent's prompt.
 */
const OUTPUT_FORMAT = `
请以 JSON 数组格式返回结果，每条包含以下字段：
[
  {
    "title": "新闻标题",
    "summary": "150-200字摘要，包含关键数据和事实",
    "source": "来源网站名（如 TechCrunch、Reuters）",
    "url": "原文链接",
    "relevance": "一句话说明为什么这条信息重要"
  }
]

要求：
- 只返回过去24小时内的新闻
- 返回 8-15 条高质量结果
- 优先选择有实质内容的深度报道，忽略重复和低质量内容
- 中英文来源都要覆盖
- 摘要必须包含具体数据、人名、公司名等关键信息
- 直接输出 JSON 数组，不要包裹在代码块中
`.trim();

/**
 * Each agent gets a tailored system prompt that highlights its strengths.
 */
const AGENT_SYSTEM_PROMPTS: Record<SearchAgentId, string> = {
  grok: `你是一个专业的新闻搜索助手，擅长从 X/Twitter 和社交媒体捕捉实时讨论和热点。
你的优势是速度和社交舆论洞察。搜索时请特别关注：
- X/Twitter 上的热门讨论和意见领袖观点
- 突发新闻和实时事件
- 社交媒体上的独家爆料
- 公众情绪和舆论走向`,

  gemini: `你是一个专业的新闻搜索助手，擅长深度搜索和学术内容发现。
你的优势是 Google 搜索的广度和深度。搜索时请特别关注：
- 主流媒体的深度报道
- arXiv 等学术平台的最新论文
- 官方公告和权威来源
- 行业报告和数据分析`,

  doubao: `你是一个专业的新闻搜索助手，擅长中文互联网信息采集。
你的优势是中文内容覆盖面广。搜索时请特别关注：
- 国内主流媒体报道（新华社、财新、第一财经等）
- 知乎、微博等社区讨论
- 头条、抖音生态中的热点
- 中国政策、监管动态
- A股、港股市场信息`,

  perplexity: `你是一个专业的新闻搜索助手，擅长快速事实核查和精确引用。
你的优势是搜索精准度和引用质量。搜索时请特别关注：
- 有明确来源的事实性报道
- 数据驱动的分析内容
- 可验证的具体信息
- 多个来源交叉印证的新闻`,
};

/**
 * Build the full user prompt for a search agent.
 */
export function buildSearchPrompt(
  agent: SearchAgentId,
  channelPrompt: string,
  ctx: SearchContext,
): { system: string; user: string } {
  const keywordsStr = ctx.keywords.length > 0
    ? `\n关键词：${ctx.keywords.join("、")}`
    : "";
  const sourcesStr = ctx.sources.length > 0
    ? `\n推荐来源：${ctx.sources.join("、")}`
    : "";

  const system = AGENT_SYSTEM_PROMPTS[agent];
  const user = `频道：${ctx.channelName}
日期：${ctx.date}
${channelPrompt}${keywordsStr}${sourcesStr}

${OUTPUT_FORMAT}`;

  return { system, user };
}

/**
 * Build the integration prompt for Layer 2 (Claude / DeepSeek).
 * This prompt asks the model to deduplicate, verify, rank,
 * and output the final DailyDigest JSON in one pass.
 */
export function buildIntegrationPrompt(input: {
  channelName: string;
  channelDescription: string;
  channelId: string;
  date: string;
  weekday: string;
  searchPrompt: string;
  rawResults: Array<{ agent: string; items: Array<Record<string, string>> }>;
  maxArticles?: number;
}): { system: string; user: string } {
  const maxN = input.maxArticles ?? 5;

  const system = `你是一个专业的新闻编辑和信息整合专家。你的任务是将多个 AI 搜索引擎返回的原始结果整合为一份高质量的每日摘要。

⚠️ 重要：搜索结果中包含验证元数据，你必须利用它们判断新闻真实性：
- "_urlValid": true/false — 该 URL 是否经过 HTTP HEAD 验证可访问
- "_crossRefCount": 数字 — 该新闻被多少个不同搜索维度独立发现

你需要在一个回复中完成以下所有步骤：
1. 真实性过滤：优先选择 _urlValid=true 的条目；_urlValid=false 的条目要持怀疑态度，如果内容看起来过于精确或耸动（如虚构的产品发布、编造的数据），应直接丢弃
2. 去重：对比所有来源的标题和内容，合并语义相似的条目，保留信息最完整的版本
3. 交叉验证：_crossRefCount >= 2 的新闻标记为 verified: true；仅被 1 个维度发现且 URL 无效的，不应入选
4. 重要性排序：importance = 时效性 × 相关性 × 可信度(URL验证+交叉引用) × 独特性，范围 0-1
5. 补充分析：为每篇文章添加 context 字段，说明为什么这条信息重要、有什么相关背景
6. 精选 Top ${maxN}：只保留最重要的 ${maxN} 篇，宁缺毋滥，不要编造内容来凑数
7. 生成综述：用 80 字以内概括今日要点
8. 直接输出 JSON：严格按指定 Schema 输出，不要包裹代码块`;

  const user = `频道：${input.channelName}（${input.channelId}）
描述：${input.channelDescription}
日期：${input.date}（${input.weekday}）
搜索提示：${input.searchPrompt}

以下是各搜索引擎返回的原始结果：

${input.rawResults
  .map((r) =>
    `=== ${r.agent.toUpperCase()} 返回 ${r.items.length} 条 ===\n${JSON.stringify(r.items, null, 2)}`
  )
  .join("\n\n")}

请整合以上结果，输出如下 JSON（不要代码块包裹）：
{
  "date": "${input.date}",
  "weekday": "${input.weekday}",
  "channel": "${input.channelId}",
  "topic": "一句话主题摘要",
  "digest": "80字以内今日综述",
  "articles": [
    {
      "title": "文章标题",
      "summary": "150-200字摘要",
      "source": "来源名",
      "sourceAgents": ["agent1", "agent2"],
      "verified": true,
      "importance": 0.92,
      "tags": ["标签1", "标签2"],
      "image": "",
      "url": "原文链接",
      "context": "为什么重要 + 相关背景"
    }
  ]
}

注意：
- articles 数组最多 ${maxN} 篇，如果可信内容不足 ${maxN} 篇，宁可少选也不要编造
- sourceAgents 填写实际搜到这条新闻的 agent 名称
- verified 为 true 当且仅当 _crossRefCount >= 2（被多个搜索维度独立发现）
- _urlValid=false 且 _crossRefCount=1 的条目大概率是 AI 幻觉，除非内容本身非常合理否则应丢弃
- importance 范围 0.0 - 1.0，_urlValid=true 的条目应获得更高分
- tags 每篇 2-4 个
- image 字段留空字符串（后续自动填充）
- url 字段必须使用原始搜索结果中的 URL，禁止自行编造 URL`;

  return { system, user };
}
