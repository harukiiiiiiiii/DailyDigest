"use client";

import { useState, type KeyboardEvent } from "react";
import { X } from "lucide-react";
import type { ChannelCreatorState } from "@/lib/types";

interface Props {
  state: ChannelCreatorState;
  update: (patch: Partial<ChannelCreatorState>) => void;
}

export default function StepTopic({ state, update }: Props) {
  const [kwInput, setKwInput] = useState("");

  const addKeyword = (val: string) => {
    const trimmed = val.trim();
    if (trimmed && !state.keywords.includes(trimmed)) {
      update({ keywords: [...state.keywords, trimmed] });
    }
    setKwInput("");
  };

  const removeKeyword = (kw: string) => {
    update({ keywords: state.keywords.filter((k) => k !== kw) });
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addKeyword(kwInput);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold mb-1">定义你的频道</h2>
        <p className="text-sm text-text-secondary">
          告诉我们你想关注什么方向，AI 会基于此定制搜索策略
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <div>
          <label className="block text-sm font-medium mb-1.5">
            频道名称 <span className="text-red-400">*</span>
          </label>
          <input
            type="text"
            value={state.name}
            onChange={(e) => update({ name: e.target.value })}
            placeholder="例：AI 前沿"
            className="w-full px-4 py-2.5 rounded-lg border border-border text-sm
              focus:outline-none focus:ring-2 focus:ring-channel-primary/30 focus:border-channel-primary
              transition-all"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1.5">
            英文名称
          </label>
          <input
            type="text"
            value={state.nameEn}
            onChange={(e) => update({ nameEn: e.target.value })}
            placeholder="例：AI Frontier"
            className="w-full px-4 py-2.5 rounded-lg border border-border text-sm
              focus:outline-none focus:ring-2 focus:ring-channel-primary/30 focus:border-channel-primary
              transition-all"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1.5">
          频道描述
        </label>
        <textarea
          value={state.description}
          onChange={(e) => update({ description: e.target.value })}
          rows={3}
          placeholder="描述这个频道关注的方向、内容偏好…"
          className="w-full px-4 py-2.5 rounded-lg border border-border text-sm resize-none
            focus:outline-none focus:ring-2 focus:ring-channel-primary/30 focus:border-channel-primary
            transition-all"
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1.5">
          关键词标签
        </label>
        <div className="flex flex-wrap gap-2 mb-2">
          {state.keywords.map((kw) => (
            <span
              key={kw}
              className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-channel-surface text-channel-primary-dark text-sm font-medium"
            >
              {kw}
              <button
                onClick={() => removeKeyword(kw)}
                className="hover:text-red-500 transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </span>
          ))}
        </div>
        <input
          type="text"
          value={kwInput}
          onChange={(e) => setKwInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="输入关键词，按回车添加"
          className="w-full px-4 py-2.5 rounded-lg border border-border text-sm
            focus:outline-none focus:ring-2 focus:ring-channel-primary/30 focus:border-channel-primary
            transition-all"
        />
      </div>
    </div>
  );
}
