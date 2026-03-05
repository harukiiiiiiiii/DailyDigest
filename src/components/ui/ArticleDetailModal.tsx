"use client";

import { useState, useCallback, createContext, useContext } from "react";
import { X, ExternalLink, CheckCircle, Tag, BarChart3 } from "lucide-react";
import type { Article } from "@/lib/types";
import ArticleImage from "./ArticleImage";

// ─── Context for modal state ───────────────────────────────
interface ModalContextType {
  openArticle: (article: Article) => void;
}

const ModalContext = createContext<ModalContextType>({
  openArticle: () => {},
});

export function useArticleModal() {
  return useContext(ModalContext);
}

// ─── Provider wrapping templates ───────────────────────────
export function ArticleModalProvider({ children }: { children: React.ReactNode }) {
  const [article, setArticle] = useState<Article | null>(null);

  const openArticle = useCallback((a: Article) => setArticle(a), []);
  const close = useCallback(() => setArticle(null), []);

  return (
    <ModalContext.Provider value={{ openArticle }}>
      {children}
      {article && <ArticleDetailModal article={article} onClose={close} />}
    </ModalContext.Provider>
  );
}

// ─── Modal Component ───────────────────────────────────────
function ArticleDetailModal({
  article,
  onClose,
}: {
  article: Article;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

      {/* Modal */}
      <div
        className="relative w-full max-w-2xl max-h-[85vh] overflow-y-auto bg-white rounded-2xl shadow-2xl animate-in fade-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Hero Image */}
        <div className="relative aspect-[2/1] overflow-hidden rounded-t-2xl">
          <ArticleImage
            src={article.image}
            alt={article.title}
            fallbackSeed={`detail-${article.title.slice(0, 10)}`}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-8 h-8 rounded-full bg-black/40 backdrop-blur-sm text-white flex items-center justify-center hover:bg-black/60 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
          <div className="absolute bottom-4 left-5 right-5">
            <div className="flex items-center gap-2 mb-2">
              {article.verified && (
                <span className="flex items-center gap-1 text-xs text-emerald-300 font-medium">
                  <CheckCircle className="w-3.5 h-3.5" />
                  已验证
                </span>
              )}
              <span className="text-xs text-white/70">{article.source}</span>
            </div>
            <h2 className="text-lg sm:text-xl font-bold text-white leading-snug">
              {article.title}
            </h2>
          </div>
        </div>

        {/* Content */}
        <div className="p-5 sm:p-6 space-y-5">
          {/* Importance bar */}
          <div className="flex items-center gap-3">
            <BarChart3 className="w-4 h-4 text-channel-primary flex-shrink-0" />
            <div className="flex-1 h-2 bg-channel-surface rounded-full overflow-hidden">
              <div
                className="h-full rounded-full bg-channel-primary transition-all"
                style={{ width: `${article.importance * 100}%` }}
              />
            </div>
            <span className="text-sm font-semibold text-channel-primary">
              {Math.round(article.importance * 100)}%
            </span>
          </div>

          {/* Summary */}
          <div>
            <h3 className="text-sm font-semibold text-text-primary mb-2">摘要</h3>
            <p className="text-sm text-text-secondary leading-relaxed">
              {article.summary}
            </p>
          </div>

          {/* Context / Analysis */}
          {article.context && (
            <div className="border-l-2 border-channel-primary pl-4">
              <h3 className="text-sm font-semibold text-text-primary mb-2">
                深度分析
              </h3>
              <p className="text-sm text-text-secondary leading-relaxed">
                {article.context}
              </p>
            </div>
          )}

          {/* Tags */}
          {article.tags.length > 0 && (
            <div className="flex items-start gap-2">
              <Tag className="w-4 h-4 text-text-muted mt-0.5 flex-shrink-0" />
              <div className="flex flex-wrap gap-1.5">
                {article.tags.map((t) => (
                  <span
                    key={t}
                    className="text-xs px-2.5 py-1 rounded-full bg-channel-surface text-channel-primary-dark font-medium"
                  >
                    {t}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Source agents */}
          <div className="text-xs text-text-muted">
            来源 Agent：{article.sourceAgents.join(", ")}
          </div>

          {/* Link */}
          <a
            href={article.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-channel-primary text-white text-sm font-medium hover:opacity-90 transition-opacity"
          >
            查看原文 <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>
    </div>
  );
}
