"use client";

import { useState, useEffect, useRef, type KeyboardEvent } from "react";
import { X, CheckCircle, AlertTriangle, Ban, HelpCircle, Loader2 } from "lucide-react";
import type { ChannelCreatorState, SourceFeasibility } from "@/lib/types";

interface Props {
  state: ChannelCreatorState;
  update: (patch: Partial<ChannelCreatorState>) => void;
}

const statusConfig = {
  easy: { icon: CheckCircle, color: "text-emerald-500", bg: "bg-emerald-50", label: "易获取" },
  partial: { icon: AlertTriangle, color: "text-amber-500", bg: "bg-amber-50", label: "部分可获取" },
  hard: { icon: HelpCircle, color: "text-orange-500", bg: "bg-orange-50", label: "较难获取" },
  impossible: { icon: Ban, color: "text-red-500", bg: "bg-red-50", label: "无法搜索" },
};

export default function StepSources({ state, update }: Props) {
  const [srcInput, setSrcInput] = useState("");
  const [feasibility, setFeasibility] = useState<SourceFeasibility[]>([]);
  const [analyzing, setAnalyzing] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const addSource = (val: string) => {
    const trimmed = val.trim();
    if (trimmed && !state.sources.includes(trimmed)) {
      update({ sources: [...state.sources, trimmed] });
    }
    setSrcInput("");
  };

  const removeSource = (s: string) => {
    update({ sources: state.sources.filter((x) => x !== s) });
    setFeasibility((prev) => prev.filter((f) => f.source !== s));
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addSource(srcInput);
    }
  };

  // Auto-analyze when sources change (debounced)
  useEffect(() => {
    if (state.sources.length === 0) {
      setFeasibility([]);
      return;
    }

    // Only analyze sources not yet analyzed
    const newSources = state.sources.filter(
      (s) => !feasibility.some((f) => f.source === s)
    );
    if (newSources.length === 0) return;

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      analyzeSources(newSources);
    }, 600);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.sources]);

  const analyzeSources = async (sources: string[]) => {
    setAnalyzing(true);
    try {
      const res = await fetch("/api/analyze-sources", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sources, channelName: state.name }),
      });
      const data = await res.json();
      if (data.results && Array.isArray(data.results)) {
        setFeasibility((prev) => {
          const existing = new Set(prev.map((f) => f.source));
          const newResults = data.results.filter(
            (r: SourceFeasibility) => !existing.has(r.source)
          );
          return [...prev, ...newResults];
        });
      }
    } catch {
      // silently fail — user can still proceed
    } finally {
      setAnalyzing(false);
    }
  };

  const displayFeasibility = feasibility.filter((f) =>
    state.sources.includes(f.source)
  );

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold mb-1">配置信息来源</h2>
        <p className="text-sm text-text-secondary">
          告诉 AI 从哪些地方搜索信息，留空将在下一步由 AI 自动推荐可靠来源
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1.5">信息来源</label>
        <div className="flex flex-wrap gap-2 mb-2">
          {state.sources.map((s) => (
            <span
              key={s}
              className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-channel-surface text-channel-primary-dark text-sm font-medium"
            >
              {s}
              <button onClick={() => removeSource(s)} className="hover:text-red-500 transition-colors">
                <X className="w-3.5 h-3.5" />
              </button>
            </span>
          ))}
        </div>
        <input
          type="text"
          value={srcInput}
          onChange={(e) => setSrcInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="输入来源名称（如 arXiv、TechCrunch、知乎），按回车添加"
          className="w-full px-4 py-2.5 rounded-lg border border-border text-sm
            focus:outline-none focus:ring-2 focus:ring-channel-primary/30 focus:border-channel-primary transition-all"
        />
      </div>

      {(displayFeasibility.length > 0 || analyzing) && (
        <div>
          <h3 className="flex items-center gap-2 text-sm font-medium mb-3">
            来源可行性分析
            {analyzing && <Loader2 className="w-3.5 h-3.5 animate-spin text-channel-primary" />}
          </h3>
          <div className="space-y-2">
            {displayFeasibility.map((f) => {
              const cfg = statusConfig[f.status] || statusConfig.easy;
              const Icon = cfg.icon;
              return (
                <div key={f.source} className={`flex items-start gap-3 p-3 rounded-lg ${cfg.bg}`}>
                  <Icon className={`w-4 h-4 mt-0.5 flex-shrink-0 ${cfg.color}`} />
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{f.source}</span>
                      <span className={`text-xs ${cfg.color}`}>{cfg.label}</span>
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

      <div>
        <label className="block text-sm font-medium mb-1.5">关注点与偏好</label>
        <textarea
          value={state.focusNotes}
          onChange={(e) => update({ focusNotes: e.target.value })}
          rows={3}
          placeholder='例："每天 3-5 条就够，贵精不贵多"、"中英文都要"、"突发 + 深度，不要教程"'
          className="w-full px-4 py-2.5 rounded-lg border border-border text-sm resize-none
            focus:outline-none focus:ring-2 focus:ring-channel-primary/30 focus:border-channel-primary transition-all"
        />
      </div>
    </div>
  );
}
