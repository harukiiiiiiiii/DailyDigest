"use client";

import { useState, useEffect } from "react";
import {
  Trash2,
  ExternalLink,
  Loader2,
  Play,
  Check,
  AlertCircle,
  RefreshCw,
} from "lucide-react";
import type { ChannelConfig } from "@/lib/types";
import { getIcon } from "@/lib/icons";

type RunState =
  | { status: "idle" }
  | { status: "running" }
  | { status: "done"; articles: number; cost: number; topic: string }
  | { status: "error"; message: string };

export default function ChannelsTab() {
  const [channels, setChannels] = useState<ChannelConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [runStates, setRunStates] = useState<Record<string, RunState>>({});
  const [runningAll, setRunningAll] = useState(false);

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
    setRunStates((s) => ({ ...s, [channelId]: { status: "running" } }));
    try {
      const res = await fetch("/api/run-pipeline", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ channelId, date: today }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "生成失败");
      setRunStates((s) => ({
        ...s,
        [channelId]: {
          status: "done",
          articles: data.articles,
          cost: data.cost,
          topic: data.topic,
        },
      }));
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
    if (
      !confirm(
        `确定删除频道「${channels.find((c) => c.id === id)?.name}」？数据不会被删除。`,
      )
    )
      return;
    const res = await fetch(`/api/channels/${id}`, { method: "DELETE" });
    if (res.ok) setChannels((ch) => ch.filter((c) => c.id !== id));
  };

  if (loading)
    return (
      <div className="py-12 text-center text-text-muted">加载中…</div>
    );

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

        return (
          <div
            key={ch.id}
            className="bg-white rounded-xl border border-border overflow-hidden"
          >
            <div className="flex items-center gap-4 p-4">
              <Icon className="w-5 h-5 text-text-muted flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="font-medium text-sm">
                  {ch.name}{" "}
                  <span className="text-text-muted text-xs ml-1">
                    {ch.nameEn}
                  </span>
                </div>
                <div className="text-xs text-text-muted mt-0.5">
                  {ch.template} · {ch.colorScheme} · Agent:{" "}
                  {ch.agentCombo.join(", ")} · 整合: {ch.integrationModel}
                </div>
              </div>

              {/* generate button */}
              <button
                onClick={() => handleGenerate(ch.id)}
                disabled={run.status === "running"}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg
                  border transition-all flex-shrink-0
                  ${
                    run.status === "done"
                      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                      : run.status === "error"
                        ? "border-red-200 bg-red-50 text-red-600"
                        : "border-border hover:bg-gray-50 text-text-secondary"
                  }
                  disabled:opacity-60`}
                title={`为 ${ch.name} 生成 ${today} 的内容`}
              >
                {run.status === "running" && (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    生成中
                  </>
                )}
                {run.status === "done" && (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    {run.articles} 篇
                  </>
                )}
                {run.status === "error" && (
                  <>
                    <AlertCircle className="w-3.5 h-3.5" />
                    失败
                  </>
                )}
                {run.status === "idle" && (
                  <>
                    <Play className="w-3.5 h-3.5" />
                    生成
                  </>
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

            {/* result detail */}
            {run.status === "done" && (
              <div className="px-4 pb-3 -mt-1">
                <div className="text-xs text-emerald-600 bg-emerald-50 rounded-lg px-3 py-2">
                  {run.topic && (
                    <span className="font-medium">{run.topic}</span>
                  )}
                  <span className="text-emerald-500 ml-2">
                    {run.articles} 篇 · ${run.cost?.toFixed(4)}
                  </span>
                </div>
              </div>
            )}
            {run.status === "error" && (
              <div className="px-4 pb-3 -mt-1">
                <div className="text-xs text-red-500 bg-red-50 rounded-lg px-3 py-2 break-all">
                  {run.message}
                </div>
              </div>
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
