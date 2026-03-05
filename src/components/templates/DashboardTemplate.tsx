"use client";

import {
  ExternalLink,
  CheckCircle,
  BarChart3,
  FileText,
  ShieldCheck,
  TrendingUp,
} from "lucide-react";
import type { Article } from "@/lib/types";
import ArticleImage from "@/components/ui/ArticleImage";
import { useArticleModal } from "@/components/ui/ArticleDetailModal";

interface Props {
  articles: Article[];
}

function StatCard({
  icon: Icon,
  label,
  value,
  sub,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div className="bg-white rounded-xl p-4 shadow-sm">
      <div className="flex items-center gap-2 mb-2">
        <div className="w-8 h-8 rounded-lg gradient-channel-soft flex items-center justify-center">
          <Icon className="w-4 h-4 text-channel-primary" />
        </div>
        <span className="text-xs text-text-muted">{label}</span>
      </div>
      <div className="text-2xl font-bold">{value}</div>
      {sub && <div className="text-xs text-text-secondary mt-0.5">{sub}</div>}
    </div>
  );
}

export default function DashboardTemplate({ articles }: Props) {
  const { openArticle } = useArticleModal();
  const verifiedCount = articles.filter((a) => a.verified).length;
  const avgImportance =
    articles.reduce((sum, a) => sum + a.importance, 0) / articles.length;
  const allTags = [...new Set(articles.flatMap((a) => a.tags))];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={FileText}
          label="精选文章"
          value={String(articles.length)}
          sub="篇"
        />
        <StatCard
          icon={ShieldCheck}
          label="已验证"
          value={String(verifiedCount)}
          sub={`${Math.round((verifiedCount / articles.length) * 100)}%`}
        />
        <StatCard
          icon={TrendingUp}
          label="平均重要性"
          value={`${Math.round(avgImportance * 100)}%`}
        />
        <StatCard
          icon={BarChart3}
          label="覆盖标签"
          value={String(allTags.length)}
          sub="个"
        />
      </div>

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-channel-bg/50">
                <th className="text-left p-4 font-medium text-text-secondary w-8">
                  #
                </th>
                <th className="text-left p-4 font-medium text-text-secondary">
                  标题
                </th>
                <th className="text-left p-4 font-medium text-text-secondary hidden md:table-cell">
                  来源
                </th>
                <th className="text-center p-4 font-medium text-text-secondary hidden sm:table-cell">
                  状态
                </th>
                <th className="text-center p-4 font-medium text-text-secondary">
                  重要性
                </th>
                <th className="text-left p-4 font-medium text-text-secondary hidden lg:table-cell">
                  标签
                </th>
                <th className="text-center p-4 font-medium text-text-secondary w-10">
                  链接
                </th>
              </tr>
            </thead>
            <tbody>
              {articles.map((article, i) => (
                <tr
                  key={i}
                  className="border-b border-border-light hover:bg-channel-bg/30 transition-colors cursor-pointer"
                  onClick={() => openArticle(article)}
                >
                  <td className="p-4 text-text-muted font-mono text-xs">
                    {i + 1}
                  </td>
                  <td className="p-4">
                    <div className="font-medium text-sm leading-snug mb-0.5">
                      {article.title}
                    </div>
                    <div className="text-xs text-text-secondary line-clamp-1">
                      {article.context}
                    </div>
                  </td>
                  <td className="p-4 text-xs text-text-secondary hidden md:table-cell">
                    {article.source}
                  </td>
                  <td className="p-4 text-center hidden sm:table-cell">
                    {article.verified ? (
                      <CheckCircle className="w-4 h-4 text-emerald-500 mx-auto" />
                    ) : (
                      <span className="text-xs text-text-muted">—</span>
                    )}
                  </td>
                  <td className="p-4 text-center">
                    <div
                      className="inline-flex items-center justify-center w-10 h-10 rounded-full text-xs font-bold"
                      style={{
                        background: `conic-gradient(var(--channel-primary) ${article.importance * 360}deg, var(--channel-surface) 0deg)`,
                      }}
                    >
                      <span className="w-7 h-7 rounded-full bg-white flex items-center justify-center">
                        {Math.round(article.importance * 100)}
                      </span>
                    </div>
                  </td>
                  <td className="p-4 hidden lg:table-cell">
                    <div className="flex flex-wrap gap-1">
                      {article.tags.slice(0, 2).map((t) => (
                        <span
                          key={t}
                          className="text-xs px-1.5 py-0.5 rounded bg-channel-surface text-channel-primary-dark"
                        >
                          {t}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="p-4 text-center">
                    <a
                      href={article.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-text-muted hover:text-channel-primary transition-colors"
                    >
                      <ExternalLink className="w-3.5 h-3.5 mx-auto" />
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {articles.map((article, i) => (
          <div
            key={i}
            className="bg-white rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
            onClick={() => openArticle(article)}
          >
            <div className="flex items-start gap-3">
              <ArticleImage
                src={article.image}
                alt={article.title}
                fallbackSeed={`dash-${i}`}
                className="w-16 h-16 rounded-lg object-cover flex-shrink-0"
              />
              <div className="min-w-0">
                <h3 className="font-semibold text-sm leading-snug mb-1 line-clamp-1">
                  {article.title}
                </h3>
                <p className="text-xs text-text-secondary line-clamp-2 leading-relaxed mb-2">
                  {article.summary}
                </p>
                <div className="flex items-center gap-2 text-xs text-text-muted">
                  <span>{article.source}</span>
                  <span>·</span>
                  <span>
                    {article.sourceAgents.join(", ")}
                  </span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
