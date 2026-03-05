"use client";

import { useState } from "react";
import {
  Loader2,
  Sparkles,
  Eye,
  CheckCircle,
  AlertTriangle,
  Ban,
  HelpCircle,
  Lightbulb,
} from "lucide-react";
import type { ChannelCreatorState, Article, SourceFeasibility } from "@/lib/types";
import { colorSchemes, getColorCSSVars } from "@/lib/colors";
import TemplateRenderer from "@/components/templates/TemplateRenderer";

interface Props {
  state: ChannelCreatorState;
  onConfigGenerated?: (config: Record<string, unknown>) => void;
}

interface GenerateResult {
  searchPrompt: string;
  sourceFeasibility: SourceFeasibility[];
  sampleArticles: Article[];
  suggestedSources: Array<{ name: string; reason: string }>;
  suggestedKeywords: string[];
  config: Record<string, unknown>;
}

const feasibilityIcons = {
  easy: CheckCircle,
  partial: AlertTriangle,
  hard: HelpCircle,
  impossible: Ban,
};
const feasibilityStyles = {
  easy: { color: "text-emerald-500", bg: "bg-emerald-50", label: "易获取" },
  partial: { color: "text-amber-500", bg: "bg-amber-50", label: "部分可获取" },
  hard: { color: "text-orange-500", bg: "bg-orange-50", label: "较难获取" },
  impossible: { color: "text-red-500", bg: "bg-red-50", label: "无法搜索" },
};

export default function StepGenerate({ state, onConfigGenerated }: Props) {
  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState<GenerateResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const colorVars = getColorCSSVars(state.colorScheme);
  const scheme = colorSchemes[state.colorScheme];

  const handleGenerate = async () => {
    setGenerating(true);
    setError(null);
    try {
      const res = await fetch("/api/generate-channel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: state.name,
          nameEn: state.nameEn,
          description: state.description,
          keywords: state.keywords,
          sources: state.sources,
          focusNotes: state.focusNotes,
          template: state.template,
          colorScheme: state.colorScheme,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "生成失败");
      setResult(data);
      if (data.config) onConfigGenerated?.(data.config);
    } catch (err) {
      setError(err instanceof Error ? err.message : "未知错误");
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold mb-1">AI 生成频道配置</h2>
        <p className="text-sm text-text-secondary">
          Gemini 将根据你的设置生成搜索提示词、评估来源可行性并创建示例内容
        </p>
      </div>

      {/* config summary */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="rounded-xl border border-border p-4">
          <h3 className="text-xs text-text-muted mb-2 uppercase tracking-wider">频道信息</h3>
          <div className="space-y-1.5 text-sm">
            <div>
              <span className="text-text-secondary">名称：</span>
              <span className="font-medium">{state.name}</span>
              {state.nameEn && <span className="text-text-muted ml-1">({state.nameEn})</span>}
            </div>
            {state.description && (
              <div className="text-text-secondary text-xs">{state.description}</div>
            )}
            {state.keywords.length > 0 && (
              <div className="flex flex-wrap gap-1 pt-1">
                {state.keywords.map((k) => (
                  <span key={k} className="px-2 py-0.5 text-xs rounded-full bg-gray-100 text-text-secondary">{k}</span>
                ))}
              </div>
            )}
          </div>
        </div>
        <div className="rounded-xl border border-border p-4">
          <h3 className="text-xs text-text-muted mb-2 uppercase tracking-wider">展示配置</h3>
          <div className="space-y-1.5 text-sm">
            <div>
              <span className="text-text-secondary">布局：</span>
              <span className="font-medium capitalize">{state.template}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-text-secondary">配色：</span>
              <span className="inline-block w-4 h-4 rounded-full" style={{ background: `linear-gradient(135deg, ${scheme.primary}, ${scheme.accent})` }} />
              <span className="font-medium">{scheme.name}</span>
            </div>
            {state.sources.length > 0 && (
              <div>
                <span className="text-text-secondary">来源：</span>
                <span className="text-xs">{state.sources.join("、")}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* generate button */}
      {!result && (
        <div className="text-center py-4">
          <button
            onClick={handleGenerate}
            disabled={generating}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-channel-primary text-white font-medium hover:opacity-90 disabled:opacity-70 transition-opacity"
          >
            {generating ? (
              <><Loader2 className="w-4 h-4 animate-spin" />AI 生成中，请稍候…</>
            ) : (
              <><Sparkles className="w-4 h-4" />生成配置与示例</>
            )}
          </button>
          {error && (
            <p className="text-sm text-red-500 mt-3">{error}</p>
          )}
        </div>
      )}

      {/* AI results */}
      {result && (
        <div className="space-y-6">
          {/* search prompt */}
          <div className="rounded-xl border border-border p-4">
            <h3 className="text-xs text-text-muted mb-2 uppercase tracking-wider">AI 生成的搜索提示词</h3>
            <p className="text-sm text-text-secondary leading-relaxed">{result.searchPrompt}</p>
          </div>

          {/* suggested keywords */}
          {result.suggestedKeywords && result.suggestedKeywords.length > 0 && state.keywords.length === 0 && (
            <div className="rounded-xl border border-border p-4">
              <h3 className="flex items-center gap-1.5 text-xs text-text-muted mb-2 uppercase tracking-wider">
                <Lightbulb className="w-3.5 h-3.5" />AI 推荐关键词
              </h3>
              <div className="flex flex-wrap gap-1.5">
                {result.suggestedKeywords.map((k) => (
                  <span key={k} className="px-2.5 py-1 text-xs rounded-full bg-channel-surface text-channel-primary-dark font-medium">{k}</span>
                ))}
              </div>
            </div>
          )}

          {/* suggested sources */}
          {result.suggestedSources && result.suggestedSources.length > 0 && state.sources.length === 0 && (
            <div className="rounded-xl border border-border p-4">
              <h3 className="flex items-center gap-1.5 text-xs text-text-muted mb-2 uppercase tracking-wider">
                <Lightbulb className="w-3.5 h-3.5" />AI 推荐来源
              </h3>
              <div className="space-y-2">
                {result.suggestedSources.map((s) => (
                  <div key={s.name} className="flex items-start gap-2 text-sm">
                    <CheckCircle className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                    <div>
                      <span className="font-medium">{s.name}</span>
                      <span className="text-text-muted ml-1.5 text-xs">— {s.reason}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* source feasibility */}
          {result.sourceFeasibility && result.sourceFeasibility.length > 0 && (
            <div className="rounded-xl border border-border p-4">
              <h3 className="text-xs text-text-muted mb-2 uppercase tracking-wider">来源可行性分析</h3>
              <div className="space-y-2">
                {result.sourceFeasibility.map((f) => {
                  const style = feasibilityStyles[f.status] || feasibilityStyles.easy;
                  const Icon = feasibilityIcons[f.status] || CheckCircle;
                  return (
                    <div key={f.source} className={`flex items-start gap-3 p-3 rounded-lg ${style.bg}`}>
                      <Icon className={`w-4 h-4 mt-0.5 flex-shrink-0 ${style.color}`} />
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">{f.source}</span>
                          <span className={`text-xs ${style.color}`}>{style.label}</span>
                        </div>
                        <p className="text-xs text-text-secondary mt-0.5">{f.note}</p>
                        {f.alternative && (
                          <p className="text-xs text-channel-primary mt-1">替代方案：{f.alternative}</p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* preview toggle */}
          <div className="flex gap-3">
            <button
              onClick={() => setShowPreview(!showPreview)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-border text-sm font-medium hover:bg-gray-50 transition-colors"
            >
              <Eye className="w-4 h-4" />
              {showPreview ? "收起预览" : `查看 ${result.sampleArticles.length} 篇示例文章`}
            </button>
            <button
              onClick={handleGenerate}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-border text-sm font-medium hover:bg-gray-50 transition-colors"
            >
              <Sparkles className="w-4 h-4" />重新生成
            </button>
          </div>

          {/* template preview with AI articles */}
          {showPreview && result.sampleArticles.length > 0 && (
            <div className="rounded-xl border border-border p-5 bg-bg" style={colorVars as React.CSSProperties}>
              <h3 className="text-sm font-medium mb-4 text-text-secondary">
                使用 {scheme.name} 配色 ·{" "}
                {state.template === "magazine" ? "杂志双栏" : state.template === "feed" ? "信息流" : state.template === "cards" ? "卡片瀑布" : "数据看板"}
                {" "}布局 · AI 生成示例
              </h3>
              <TemplateRenderer
                template={state.template}
                articles={result.sampleArticles}
                colorScheme={state.colorScheme}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
