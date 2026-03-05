"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Sparkles, Loader2, Check, AlertCircle } from "lucide-react";

interface Props {
  channelId: string;
  channelName: string;
  date: string;
}

export default function GenerateButton({ channelId, channelName, date }: Props) {
  const router = useRouter();
  const [state, setState] = useState<"idle" | "running" | "done" | "error">("idle");
  const [message, setMessage] = useState("");

  const handleGenerate = async () => {
    setState("running");
    setMessage(`正在为「${channelName}」搜索并整合 ${date} 的新闻…`);

    try {
      const res = await fetch("/api/run-pipeline", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ channelId, date }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "生成失败");

      setState("done");
      setMessage(`生成完成：${data.articles} 篇文章，成本 $${data.cost?.toFixed(4) ?? "?"}`);

      setTimeout(() => router.refresh(), 1500);
    } catch (err) {
      setState("error");
      setMessage(err instanceof Error ? err.message : "未知错误");
    }
  };

  return (
    <div className="py-24 text-center">
      <div className="text-6xl mb-4">
        {state === "running" ? "🔄" : state === "done" ? "✅" : state === "error" ? "❌" : "📭"}
      </div>

      {state === "idle" && (
        <>
          <h2 className="text-xl font-semibold mb-2">暂无数据</h2>
          <p className="text-text-secondary mb-6">
            {date} 的 {channelName} 频道尚未生成内容
          </p>
          <button
            onClick={handleGenerate}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-channel-primary text-white font-medium hover:opacity-90 transition-opacity"
          >
            <Sparkles className="w-4 h-4" />
            立即生成
          </button>
        </>
      )}

      {state === "running" && (
        <>
          <h2 className="text-xl font-semibold mb-2 flex items-center justify-center gap-2">
            <Loader2 className="w-5 h-5 animate-spin" />
            生成中
          </h2>
          <p className="text-text-secondary">{message}</p>
          <p className="text-xs text-text-muted mt-2">通常需要 30-60 秒</p>
        </>
      )}

      {state === "done" && (
        <>
          <h2 className="text-xl font-semibold mb-2 flex items-center justify-center gap-2">
            <Check className="w-5 h-5 text-emerald-500" />
            生成完成
          </h2>
          <p className="text-text-secondary">{message}</p>
          <p className="text-xs text-text-muted mt-2">页面即将刷新…</p>
        </>
      )}

      {state === "error" && (
        <>
          <h2 className="text-xl font-semibold mb-2 flex items-center justify-center gap-2">
            <AlertCircle className="w-5 h-5 text-red-500" />
            生成失败
          </h2>
          <p className="text-sm text-red-500 mb-4">{message}</p>
          <button
            onClick={() => { setState("idle"); setMessage(""); }}
            className="px-4 py-2 rounded-lg text-sm font-medium border border-border hover:bg-gray-50 transition-colors"
          >
            重试
          </button>
        </>
      )}
    </div>
  );
}
