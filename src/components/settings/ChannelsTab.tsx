"use client";

import { useState, useEffect, useRef } from "react";
import {
  Trash2,
  ExternalLink,
  Loader2,
  Play,
  Check,
  AlertCircle,
  RefreshCw,
  Search,
  Filter,
  Cpu,
  Save,
  ChevronDown,
  ChevronUp,
  Settings2,
  Pencil,
} from "lucide-react";
import type { ChannelConfig } from "@/lib/types";
import { getIcon } from "@/lib/icons";

// ─── Pipeline progress types ────────────────────────────────────

interface ProgressStep {
  phase: string;
  label: string;
  detail?: string;
  status: "pending" | "active" | "done" | "error";
}

type RunState =
  | { status: "idle" }
  | { status: "running"; steps: ProgressStep[] }
  | { status: "done"; articles: number; cost: number; topic: string }
  | { status: "error"; message: string };

const PHASE_LABELS: Record<string, string> = {
  search_start: "搜索中",
  enrich_start: "验证 & 去重",
  enrich_done: "验证完成",
  integrate_start: "AI 整合",
  integrate_done: "整合完成",
  write_start: "写入数据库",
  done: "完成",
  complete: "完成",
  error: "出错",
};

function phaseToStep(evt: Record<string, unknown>): ProgressStep | null {
  const phase = evt.phase as string;
  if (phase === "search_start") {
    return { phase, label: "搜索中", detail: `Agent: ${(evt.agents as string[])?.join(", ")}`, status: "active" };
  }
  if (phase === "enrich_start") {
    return { phase, label: "验证 & 去重", status: "active" };
  }
  if (phase === "enrich_done") {
    return { phase, label: "验证完成", detail: `${evt.raw} 条 → ${evt.enriched} 条 (${evt.verified} 条已验证)`, status: "done" };
  }
  if (phase === "integrate_start") {
    return { phase, label: "AI 整合生成", status: "active" };
  }
  if (phase === "integrate_done") {
    return { phase, label: "整合完成", detail: `${evt.articles} 篇文章, $${(evt.cost as number)?.toFixed(4)}`, status: "done" };
  }
  if (phase === "write_start") {
    return { phase, label: "写入数据库", status: "active" };
  }
  if (phase === "done" || phase === "complete") {
    return { phase: "done", label: "完成", detail: `${evt.articles} 篇, $${(evt.cost as number)?.toFixed(4) ?? (evt.totalCost as number)?.toFixed(4)}`, status: "done" };
  }
  if (phase === "error") {
    return { phase, label: "出错", detail: evt.message as string, status: "error" };
  }
  return null;
}

// ─── Channel Edit Panel ──────────────────────────────────────────

function ChannelEditPanel({
  channel,
  onSave,
  onClose,
}: {
  channel: ChannelConfig;
  onSave: (updated: ChannelConfig) => void;
  onClose: () => void;
}) {
  const [form, setForm] = useState({ ...channel });
  const [keywordsText, setKeywordsText] = useState(channel.keywords.join(", "));
  const [sourcesText, setSourcesText] = useState(channel.sources.join(", "));
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  const handleSave = async () => {
    setSaving(true);
    setMsg(null);
    const updated = {
      ...form,
      keywords: keywordsText.split(/[,，]/).map((s) => s.trim()).filter(Boolean),
      sources: sourcesText.split(/[,，]/).map((s) => s.trim()).filter(Boolean),
    };
    try {
      const res = await fetch(`/api/channels/${channel.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updated),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "保存失败");
      }
      setMsg({ type: "ok", text: "已保存" });
      onSave(updated as ChannelConfig);
    } catch (err) {
      setMsg({ type: "err", text: err instanceof Error ? err.message : "保存失败" });
    } finally {
      setSaving(false);
    }
  };

  const inputCls = "w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all";
  const labelCls = "block text-xs font-medium text-text-secondary mb-1";

  return (
    <div className="border-t border-border bg-gray-50/50 p-4 space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={labelCls}>频道名称</label>
          <input className={inputCls} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        </div>
        <div>
          <label className={labelCls}>英文名</label>
          <input className={inputCls} value={form.nameEn} onChange={(e) => setForm({ ...form, nameEn: e.target.value })} />
        </div>
      </div>

      <div>
        <label className={labelCls}>描述</label>
        <input className={inputCls} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
      </div>

      <div>
        <label className={labelCls}>关键词（逗号分隔）</label>
        <textarea
          className={inputCls + " min-h-[60px] resize-y"}
          value={keywordsText}
          onChange={(e) => setKeywordsText(e.target.value)}
        />
      </div>

      <div>
        <label className={labelCls}>推荐来源（逗号分隔）</label>
        <textarea
          className={inputCls + " min-h-[60px] resize-y"}
          value={sourcesText}
          onChange={(e) => setSourcesText(e.target.value)}
        />
      </div>

      <div>
        <label className={labelCls}>搜索提示</label>
        <textarea
          className={inputCls + " min-h-[80px] resize-y"}
          value={form.searchPrompt}
          onChange={(e) => setForm({ ...form, searchPrompt: e.target.value })}
        />
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div>
          <label className={labelCls}>模板</label>
          <select className={inputCls} value={form.template} onChange={(e) => setForm({ ...form, template: e.target.value as ChannelConfig["template"] })}>
            <option value="magazine">Magazine</option>
            <option value="cards">Cards</option>
            <option value="feed">Feed</option>
            <option value="dashboard">Dashboard</option>
          </select>
        </div>
        <div>
          <label className={labelCls}>配色</label>
          <select className={inputCls} value={form.colorScheme} onChange={(e) => setForm({ ...form, colorScheme: e.target.value as ChannelConfig["colorScheme"] })}>
            {["ocean","sunset","forest","lavender","ember","arctic","midnight","sakura"].map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelCls}>图标</label>
          <input className={inputCls} value={form.icon} onChange={(e) => setForm({ ...form, icon: e.target.value })} />
        </div>
      </div>

      <div className="flex items-center gap-3 pt-1">
        <button
          onClick={handleSave}
          disabled={saving}
          className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium rounded-lg bg-gray-900 text-white hover:bg-gray-800 disabled:opacity-40 transition-all"
        >
          {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
          保存
        </button>
        <button onClick={onClose} className="px-4 py-2 text-xs font-medium rounded-lg border border-border hover:bg-gray-100 text-text-secondary transition-all">
          取消
        </button>
        {msg && (
          <span className={`text-xs flex items-center gap-1 ${msg.type === "ok" ? "text-emerald-600" : "text-red-500"}`}>
            {msg.type === "ok" ? <Check className="w-3.5 h-3.5" /> : <AlertCircle className="w-3.5 h-3.5" />}
            {msg.text}
          </span>
        )}
      </div>
    </div>
  );
}

// ─── Pipeline Progress UI ────────────────────────────────────────

function PipelineProgress({ steps }: { steps: ProgressStep[] }) {
  if (steps.length === 0) return null;

  const ICONS: Record<string, React.ElementType> = {
    search_start: Search,
    enrich_start: Filter,
    enrich_done: Filter,
    integrate_start: Cpu,
    integrate_done: Cpu,
    write_start: Save,
    done: Check,
    complete: Check,
    error: AlertCircle,
  };

  return (
    <div className="px-4 pb-3 -mt-1">
      <div className="bg-blue-50/60 rounded-lg px-3 py-2.5 space-y-1.5">
        {steps.map((step, i) => {
          const Icon = ICONS[step.phase] ?? Loader2;
          return (
            <div key={i} className="flex items-start gap-2 text-xs">
              <div className="mt-0.5 flex-shrink-0">
                {step.status === "active" ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-500" />
                ) : step.status === "done" ? (
                  <Check className="w-3.5 h-3.5 text-emerald-500" />
                ) : step.status === "error" ? (
                  <AlertCircle className="w-3.5 h-3.5 text-red-500" />
                ) : (
                  <Icon className="w-3.5 h-3.5 text-gray-300" />
                )}
              </div>
              <div className="min-w-0">
                <span className={`font-medium ${step.status === "active" ? "text-blue-700" : step.status === "error" ? "text-red-600" : "text-gray-700"}`}>
                  {step.label}
                </span>
                {step.detail && (
                  <span className="text-gray-500 ml-1.5">{step.detail}</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────

export default function ChannelsTab() {
  const [channels, setChannels] = useState<ChannelConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [runStates, setRunStates] = useState<Record<string, RunState>>({});
  const [runningAll, setRunningAll] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/channels")
      .then((r) => r.json())
      .then((data) => {
        setChannels(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const today = new Date().toISOString().split("T")[0];

  const handleGenerate = async (channelId: string) => {
    setRunStates((s) => ({ ...s, [channelId]: { status: "running", steps: [] } }));

    try {
      const res = await fetch("/api/run-pipeline-stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ channelId, date: today }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "生成失败");
      }

      const reader = res.body?.getReader();
      if (!reader) throw new Error("No stream");

      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          try {
            const evt = JSON.parse(line.slice(6));
            const step = phaseToStep(evt);

            if (evt.phase === "complete") {
              setRunStates((s) => ({
                ...s,
                [channelId]: {
                  status: "done",
                  articles: evt.articles,
                  cost: evt.cost,
                  topic: evt.topic,
                },
              }));
              continue;
            }

            if (evt.phase === "error") {
              setRunStates((s) => ({
                ...s,
                [channelId]: { status: "error", message: evt.message },
              }));
              continue;
            }

            if (step) {
              setRunStates((s) => {
                const prev = s[channelId];
                if (prev?.status !== "running") return s;
                const steps = [...prev.steps];

                // Mark previous active steps as done
                if (step.status === "active") {
                  for (const existing of steps) {
                    if (existing.status === "active") existing.status = "done";
                  }
                }

                // Update existing or add new
                const idx = steps.findIndex((st) => st.phase === step.phase);
                if (idx >= 0) {
                  steps[idx] = step;
                } else {
                  steps.push(step);
                }

                return { ...s, [channelId]: { status: "running", steps } };
              });
            }
          } catch { /* skip malformed */ }
        }
      }
    } catch (err) {
      setRunStates((s) => ({
        ...s,
        [channelId]: {
          status: "error",
          message: err instanceof Error ? err.message : "未知错误",
        },
      }));
    }
  };

  const handleGenerateAll = async () => {
    setRunningAll(true);
    for (const ch of channels) {
      await handleGenerate(ch.id);
    }
    setRunningAll(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm(`确定删除频道「${channels.find((c) => c.id === id)?.name}」？数据不会被删除。`)) return;
    const res = await fetch(`/api/channels/${id}`, { method: "DELETE" });
    if (res.ok) setChannels((ch) => ch.filter((c) => c.id !== id));
  };

  const handleSaveChannel = (updated: ChannelConfig) => {
    setChannels((chs) => chs.map((c) => (c.id === updated.id ? updated : c)));
  };

  if (loading) return <div className="py-12 text-center text-text-muted">加载中…</div>;

  return (
    <div className="space-y-4">
      {/* batch generate button */}
      {channels.length > 0 && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-text-muted">
            {today} · {channels.length} 个频道
          </p>
          <button
            onClick={handleGenerateAll}
            disabled={runningAll}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg
              bg-channel-primary text-white hover:opacity-90 disabled:opacity-60 transition-opacity"
          >
            {runningAll ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                全部生成中…
              </>
            ) : (
              <>
                <RefreshCw className="w-4 h-4" />
                全部生成今日内容
              </>
            )}
          </button>
        </div>
      )}

      {/* channel list */}
      {channels.map((ch) => {
        const Icon = getIcon(ch.icon);
        const run = runStates[ch.id] ?? { status: "idle" as const };
        const isEditing = editingId === ch.id;

        return (
          <div key={ch.id} className="bg-white rounded-xl border border-border overflow-hidden">
            <div className="flex items-center gap-4 p-4">
              <Icon className="w-5 h-5 text-text-muted flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="font-medium text-sm">
                  {ch.name}{" "}
                  <span className="text-text-muted text-xs ml-1">{ch.nameEn}</span>
                </div>
                <div className="text-xs text-text-muted mt-0.5">
                  {ch.template} · {ch.colorScheme} · Agent: {ch.agentCombo.join(", ")} · 整合: {ch.integrationModel}
                </div>
              </div>

              {/* edit button */}
              <button
                onClick={() => setEditingId(isEditing ? null : ch.id)}
                className={`p-1.5 rounded-lg transition-all flex-shrink-0 ${isEditing ? "bg-blue-50 text-blue-600" : "text-text-muted hover:text-text hover:bg-gray-50"}`}
                title="编辑频道"
              >
                <Pencil className="w-4 h-4" />
              </button>

              {/* generate button */}
              <button
                onClick={() => handleGenerate(ch.id)}
                disabled={run.status === "running"}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg
                  border transition-all flex-shrink-0
                  ${run.status === "done"
                    ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                    : run.status === "error"
                      ? "border-red-200 bg-red-50 text-red-600"
                      : "border-border hover:bg-gray-50 text-text-secondary"
                  } disabled:opacity-60`}
                title={`为 ${ch.name} 生成 ${today} 的内容`}
              >
                {run.status === "running" && (
                  <><Loader2 className="w-3.5 h-3.5 animate-spin" />生成中</>
                )}
                {run.status === "done" && (
                  <><Check className="w-3.5 h-3.5" />{run.articles} 篇</>
                )}
                {run.status === "error" && (
                  <><AlertCircle className="w-3.5 h-3.5" />失败</>
                )}
                {run.status === "idle" && (
                  <><Play className="w-3.5 h-3.5" />生成</>
                )}
              </button>

              <a
                href={`/${ch.id}/${today}`}
                className="text-text-muted hover:text-channel-primary transition-colors"
                title="查看频道"
              >
                <ExternalLink className="w-4 h-4" />
              </a>
              <button
                onClick={() => handleDelete(ch.id)}
                className="text-text-muted hover:text-red-500 transition-colors"
                title="删除频道"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>

            {/* pipeline progress */}
            {run.status === "running" && <PipelineProgress steps={run.steps} />}

            {/* result detail */}
            {run.status === "done" && (
              <div className="px-4 pb-3 -mt-1">
                <div className="text-xs text-emerald-600 bg-emerald-50 rounded-lg px-3 py-2">
                  {run.topic && <span className="font-medium">{run.topic}</span>}
                  <span className="text-emerald-500 ml-2">{run.articles} 篇 · ${run.cost?.toFixed(4)}</span>
                </div>
              </div>
            )}
            {run.status === "error" && (
              <div className="px-4 pb-3 -mt-1">
                <div className="text-xs text-red-500 bg-red-50 rounded-lg px-3 py-2 break-all">{run.message}</div>
              </div>
            )}

            {/* channel edit panel */}
            {isEditing && (
              <ChannelEditPanel
                channel={ch}
                onSave={handleSaveChannel}
                onClose={() => setEditingId(null)}
              />
            )}
          </div>
        );
      })}

      {channels.length === 0 && (
        <div className="py-12 text-center text-text-muted">暂无频道</div>
      )}
    </div>
  );
}
