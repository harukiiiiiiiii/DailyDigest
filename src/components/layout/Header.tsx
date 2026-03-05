"use client";

import Link from "next/link";
import { Sparkles, Settings } from "lucide-react";

export default function Header() {
  return (
    <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="w-9 h-9 rounded-xl gradient-channel flex items-center justify-center shadow-sm group-hover:shadow-md transition-shadow">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div className="flex flex-col">
            <span className="text-lg font-bold leading-tight tracking-tight">
              每日智讯
            </span>
            <span className="text-[10px] text-text-muted leading-none tracking-wider uppercase">
              Daily Digest
            </span>
          </div>
        </Link>

        <div className="flex items-center gap-2">
          <Link
            href="/settings"
            className="p-2 rounded-lg text-text-muted hover:text-text hover:bg-gray-100 transition-colors"
            title="系统设置"
          >
            <Settings className="w-5 h-5" />
          </Link>
          <Link
            href="/create"
            className="px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium rounded-lg bg-channel-primary text-white hover:opacity-90 transition-opacity"
          >
            <span className="sm:hidden">+</span>
            <span className="hidden sm:inline">+ 创建频道</span>
          </Link>
        </div>
      </div>
    </header>
  );
}
