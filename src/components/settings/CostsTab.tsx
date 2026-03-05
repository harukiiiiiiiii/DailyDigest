"use client";

import { useState, useEffect } from "react";
import { DollarSign, TrendingUp, FileText, Calendar } from "lucide-react";

interface CostEntry {
  channel: string;
  date: string;
  cost: number;
  articles: number;
}

export default function CostsTab() {
  const [entries, setEntries] = useState<CostEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/costs")
      .then((r) => r.json())
      .then((data) => { setEntries(data.entries ?? []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  if (loading) return <div className="py-12 text-center text-text-muted">加载中…</div>;

  const totalCost = entries.reduce((s, e) => s + e.cost, 0);
  const totalArticles = entries.reduce((s, e) => s + e.articles, 0);
  const uniqueDays = new Set(entries.map((e) => e.date)).size;
  const avgDaily = uniqueDays > 0 ? totalCost / uniqueDays : 0;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={DollarSign} label="总成本" value={`$${totalCost.toFixed(4)}`} />
        <StatCard icon={FileText} label="总文章" value={String(totalArticles)} />
        <StatCard icon={Calendar} label="运行天数" value={String(uniqueDays)} />
        <StatCard icon={TrendingUp} label="日均成本" value={`$${avgDaily.toFixed(4)}`} sub={`≈ ¥${(avgDaily * 7.2 * 30).toFixed(1)}/月`} />
      </div>

      {entries.length > 0 ? (
        <div className="bg-white rounded-xl border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-gray-50">
                <th className="text-left p-3 font-medium text-text-secondary">日期</th>
                <th className="text-left p-3 font-medium text-text-secondary">频道</th>
                <th className="text-center p-3 font-medium text-text-secondary">文章</th>
                <th className="text-right p-3 font-medium text-text-secondary">成本</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((e, i) => (
                <tr key={i} className="border-b border-border-light">
                  <td className="p-3 text-text-secondary">{e.date}</td>
                  <td className="p-3 font-medium">{e.channel}</td>
                  <td className="p-3 text-center">{e.articles}</td>
                  <td className="p-3 text-right font-mono">${e.cost.toFixed(4)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="py-12 text-center text-text-muted">暂无成本数据，运行 Pipeline 后自动记录</div>
      )}
    </div>
  );
}

function StatCard({ icon: Icon, label, value, sub }: { icon: React.ElementType; label: string; value: string; sub?: string }) {
  return (
    <div className="bg-white rounded-xl p-4 border border-border">
      <div className="flex items-center gap-2 mb-2">
        <Icon className="w-4 h-4 text-channel-primary" />
        <span className="text-xs text-text-muted">{label}</span>
      </div>
      <div className="text-xl font-bold">{value}</div>
      {sub && <div className="text-xs text-text-secondary mt-0.5">{sub}</div>}
    </div>
  );
}
