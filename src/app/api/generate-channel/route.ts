import { NextRequest, NextResponse } from "next/server";
import { callGemini } from "@/lib/gemini";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { name, nameEn, description, keywords, sources, focusNotes, template, colorScheme } = body;

  const prompt = buildPrompt({ name, nameEn, description, keywords, sources, focusNotes });

  try {
    const text = await callGemini({ system: SYSTEM_PROMPT, user: prompt });

    const parsed = extractJson(text);
    if (!parsed) {
      return NextResponse.json({ error: "Failed to parse AI response" }, { status: 500 });
    }

    const id = (nameEn || name)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");

    const config = {
      id,
      name,
      nameEn: nameEn || "",
      description: description || parsed.description || "",
      icon: parsed.icon || "newspaper",
      template,
      colorScheme,
      keywords: keywords.length > 0 ? keywords : parsed.suggestedKeywords || [],
      sources: sources.length > 0 ? sources : (Array.isArray(parsed.suggestedSources) ? (parsed.suggestedSources as Array<{ name: string }>).map((s) => s.name) : []),
      searchPrompt: parsed.searchPrompt || "",
      agentCombo: parsed.agentCombo || ["gemini"],
      integrationModel: "gemini",
      createdAt: new Date().toISOString(),
    };

    return NextResponse.json({
      searchPrompt: parsed.searchPrompt,
      sourceFeasibility: parsed.sourceFeasibility || [],
      sampleArticles: parsed.sampleArticles || [],
      suggestedSources: parsed.suggestedSources || [],
      suggestedKeywords: parsed.suggestedKeywords || [],
      config,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

const SYSTEM_PROMPT = `你是一个专业的信息聚合系统配置助手。用户正在创建一个新闻频道，你需要根据他们的输入生成完整的频道配置。

你必须返回一个 JSON 对象（不要代码块包裹），包含以下字段：

{
  "searchPrompt": "150-200字的搜索提示词，指导 AI 搜索引擎搜集该频道的内容",
  "description": "如果用户没有提供描述，生成一句简洁的频道描述",
  "icon": "推荐一个 Lucide 图标名（如 brain, trending-up, trophy, globe, zap, newspaper）",
  "agentCombo": ["推荐的搜索Agent组合，从 grok/gemini/doubao/perplexity 中选"],
  "suggestedKeywords": ["如果用户没提供关键词，推荐5-8个相关关键词"],
  "suggestedSources": [
    {"name": "来源名", "reason": "为什么推荐这个来源"}
  ],
  "sourceFeasibility": [
    {
      "source": "来源名",
      "status": "easy|partial|hard|impossible",
      "note": "说明可行性",
      "alternative": "如果搜不到，推荐替代方案（可选）"
    }
  ],
  "sampleArticles": [
    {
      "title": "模拟文章标题（贴合频道主题的真实感标题）",
      "summary": "150-200字摘要",
      "source": "来源名",
      "sourceAgents": ["gemini"],
      "verified": true,
      "importance": 0.9,
      "tags": ["标签1", "标签2"],
      "image": "",
      "url": "#",
      "context": "为什么重要"
    }
  ]
}

要求：
- searchPrompt 要详细具体，指导搜索方向、排除项、语言偏好
- sourceFeasibility 必须诚实评估每个来源的可获取性
- sampleArticles 生成 4 篇，内容要像真实新闻一样，与频道主题高度相关
- 如果用户没提供来源，suggestedSources 推荐 5 个可靠来源
- agentCombo 根据频道特点推荐最合适的搜索Agent组合
- 直接输出 JSON，不要任何包裹`;

function buildPrompt(input: {
  name: string;
  nameEn: string;
  description: string;
  keywords: string[];
  sources: string[];
  focusNotes: string;
}): string {
  const parts = [`频道名称：${input.name}`];
  if (input.nameEn) parts.push(`英文名：${input.nameEn}`);
  if (input.description) parts.push(`描述：${input.description}`);
  if (input.keywords.length > 0) parts.push(`关键词：${input.keywords.join("、")}`);
  if (input.sources.length > 0) parts.push(`指定来源：${input.sources.join("、")}`);
  if (input.focusNotes) parts.push(`关注偏好：${input.focusNotes}`);
  if (input.sources.length === 0) parts.push("用户未指定来源，请推荐 5 个可靠来源");
  if (input.keywords.length === 0) parts.push("用户未提供关键词，请推荐 5-8 个相关关键词");
  return parts.join("\n");
}

function extractJson(text: string): Record<string, unknown> | null {
  let cleaned = text.trim();
  const fenceMatch = cleaned.match(/```(?:json)?\s*\n?([\s\S]*?)```/);
  if (fenceMatch) cleaned = fenceMatch[1].trim();

  const objStart = cleaned.indexOf("{");
  const objEnd = cleaned.lastIndexOf("}");
  if (objStart === -1 || objEnd <= objStart) return null;
  cleaned = cleaned.slice(objStart, objEnd + 1);

  try {
    return JSON.parse(cleaned);
  } catch {
    return null;
  }
}
