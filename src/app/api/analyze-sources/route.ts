import { NextRequest, NextResponse } from "next/server";
import { callGemini } from "@/lib/gemini";

export async function POST(req: NextRequest) {
  const { sources, channelName } = await req.json();
  if (!sources || !Array.isArray(sources) || sources.length === 0) {
    return NextResponse.json({ results: [] });
  }

  const prompt = `分析以下信息来源对于「${channelName}」频道的可获取性。

来源列表：${sources.join("、")}

对每个来源返回一个 JSON 数组（不要代码块包裹）：
[
  {
    "source": "来源名",
    "status": "easy|partial|hard|impossible",
    "note": "具体说明可获取性（1-2句话）",
    "alternative": "如果不好获取，推荐替代方案（可选字段）"
  }
]

评估标准：
- easy: 公开网页/API，Web Search 可直接搜到
- partial: 部分内容需登录或付费，但摘要/标题可搜
- hard: 需要专用工具或方法，普通搜索难以获取
- impossible: 完全封闭、加密或需要特殊权限

直接输出 JSON 数组。`;

  try {
    const text = await callGemini({ user: prompt, maxOutputTokens: 4096, temperature: 0.2 });
    const results = extractArray(text);
    return NextResponse.json({ results });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

function extractArray(text: string): unknown[] {
  let cleaned = text.trim();
  const fenceMatch = cleaned.match(/```(?:json)?\s*\n?([\s\S]*?)```/);
  if (fenceMatch) cleaned = fenceMatch[1].trim();

  const arrStart = cleaned.indexOf("[");
  const arrEnd = cleaned.lastIndexOf("]");
  if (arrStart === -1 || arrEnd <= arrStart) return [];

  try {
    const parsed = JSON.parse(cleaned.slice(arrStart, arrEnd + 1));
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}
