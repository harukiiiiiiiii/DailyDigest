"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Save, Download, Loader2, Check } from "lucide-react";
import type { ChannelCreatorState } from "@/lib/types";
import StepTopic from "./StepTopic";
import StepSources from "./StepSources";
import StepStyle from "./StepStyle";
import StepGenerate from "./StepGenerate";

const STEPS = [
  { label: "主题方向", desc: "频道名称与关键词" },
  { label: "来源与关注点", desc: "数据源与偏好" },
  { label: "展示风格", desc: "布局与配色" },
  { label: "生成配置", desc: "预览与导出" },
];

export default function ChannelCreator() {
  const router = useRouter();
  const [state, setState] = useState<ChannelCreatorState>({
    step: 0,
    name: "",
    nameEn: "",
    description: "",
    keywords: [],
    sources: [],
    focusNotes: "",
    template: "feed",
    colorScheme: "ocean",
  });
  const [generatedConfig, setGeneratedConfig] = useState<Record<string, unknown> | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const update = (patch: Partial<ChannelCreatorState>) =>
    setState((s) => ({ ...s, ...patch }));

  const canNext = () => {
    if (state.step === 0) return state.name.trim().length > 0;
    return true;
  };

  const handleSave = async () => {
    const config = generatedConfig || buildFallbackConfig(state);
    setSaving(true);
    try {
      const res = await fetch("/api/save-channel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setSaved(true);
      setTimeout(() => {
        const id = (config as { id?: string }).id || "ai";
        const today = new Date().toISOString().split("T")[0];
        router.push(`/${id}/${today}`);
      }, 1500);
    } catch (err) {
      alert("保存失败：" + (err instanceof Error ? err.message : err));
    } finally {
      setSaving(false);
    }
  };

  const handleExport = () => {
    const config = generatedConfig || buildFallbackConfig(state);
    const blob = new Blob([JSON.stringify(config, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `channel-${(config as { id?: string }).id || state.name}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="max-w-5xl mx-auto">
      {/* stepper */}
      <div className="flex items-center justify-center gap-2 mb-10">
        {STEPS.map((s, i) => (
          <div key={i} className="flex items-center gap-2">
            <button
              onClick={() => i < state.step && update({ step: i })}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all
                ${
                  i === state.step
                    ? "bg-channel-primary text-white font-semibold shadow-sm"
                    : i < state.step
                      ? "bg-channel-surface text-channel-primary cursor-pointer hover:bg-channel-primary/20"
                      : "bg-gray-100 text-text-muted"
                }`}
            >
              <span className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center text-xs font-bold">
                {i < state.step ? "✓" : i + 1}
              </span>
              <span className="hidden sm:inline">{s.label}</span>
            </button>
            {i < STEPS.length - 1 && (
              <div className={`w-8 h-0.5 rounded ${i < state.step ? "bg-channel-primary" : "bg-gray-200"}`} />
            )}
          </div>
        ))}
      </div>

      {/* step content */}
      <div className="bg-white rounded-2xl shadow-sm p-6 sm:p-8 min-h-[400px]">
        {state.step === 0 && <StepTopic state={state} update={update} />}
        {state.step === 1 && <StepSources state={state} update={update} />}
        {state.step === 2 && <StepStyle state={state} update={update} />}
        {state.step === 3 && (
          <StepGenerate state={state} onConfigGenerated={setGeneratedConfig} />
        )}
      </div>

      {/* nav buttons */}
      <div className="flex justify-between mt-6">
        <button
          onClick={() => update({ step: Math.max(0, state.step - 1) })}
          disabled={state.step === 0}
          className="px-5 py-2.5 rounded-lg text-sm font-medium border border-border
            enabled:hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          上一步
        </button>

        {state.step < 3 ? (
          <button
            onClick={() => canNext() && update({ step: state.step + 1 })}
            disabled={!canNext()}
            className="px-5 py-2.5 rounded-lg text-sm font-medium bg-channel-primary text-white
              enabled:hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
          >
            下一步
          </button>
        ) : (
          <div className="flex gap-3">
            <button
              onClick={handleExport}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium
                border border-border hover:bg-gray-50 transition-colors"
            >
              <Download className="w-4 h-4" />
              导出 JSON
            </button>
            <button
              onClick={handleSave}
              disabled={saving || saved}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium
                bg-channel-primary text-white enabled:hover:opacity-90
                disabled:opacity-70 transition-opacity"
            >
              {saved ? (
                <><Check className="w-4 h-4" />已保存，跳转中…</>
              ) : saving ? (
                <><Loader2 className="w-4 h-4 animate-spin" />保存中…</>
              ) : (
                <><Save className="w-4 h-4" />保存频道到系统</>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function buildFallbackConfig(state: ChannelCreatorState) {
  const id = (state.nameEn || state.name)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return {
    id,
    name: state.name,
    nameEn: state.nameEn,
    description: state.description,
    icon: "newspaper",
    template: state.template,
    colorScheme: state.colorScheme,
    keywords: state.keywords,
    sources: state.sources,
    searchPrompt: `搜索过去24小时内与"${state.name}"相关的重要新闻和信息。${state.focusNotes}`,
    agentCombo: ["gemini"],
    integrationModel: "gemini",
    createdAt: new Date().toISOString(),
  };
}
