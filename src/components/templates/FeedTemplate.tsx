"use client";

import { ExternalLink, CheckCircle } from "lucide-react";
import type { Article } from "@/lib/types";
import ArticleImage from "@/components/ui/ArticleImage";
import { useArticleModal } from "@/components/ui/ArticleDetailModal";

interface Props {
  articles: Article[];
}

function FeedItem({
  article,
  index,
}: {
  article: Article;
  index: number;
}) {
  const { openArticle } = useArticleModal();
  return (
    <article
      className="group flex gap-4 sm:gap-5 p-4 sm:p-5 bg-white rounded-xl shadow-sm hover:shadow-md transition-all duration-300 cursor-pointer"
      onClick={() => openArticle(article)}
    >
      <div className="hidden sm:block w-32 h-24 flex-shrink-0 rounded-lg overflow-hidden">
        <ArticleImage
          src={article.image}
          alt={article.title}
          fallbackSeed={`feed-${index}`}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
        />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1.5">
          <span className="text-xs font-bold text-channel-primary w-5">
            {String(index + 1).padStart(2, "0")}
          </span>
          <span className="text-xs text-text-muted">{article.source}</span>
          {article.verified && (
            <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
          )}
          <span className="ml-auto text-xs font-medium text-channel-primary">
            {Math.round(article.importance * 100)}%
          </span>
        </div>
        <h3 className="font-semibold text-sm sm:text-base leading-snug mb-1.5 group-hover:text-channel-primary transition-colors">
          {article.title}
        </h3>
        <p className="text-xs sm:text-sm text-text-secondary line-clamp-2 leading-relaxed mb-2">
          {article.summary}
        </p>
        <div className="flex items-center gap-2 flex-wrap">
          {article.tags.map((t) => (
            <span
              key={t}
              className="text-xs px-2 py-0.5 rounded-full bg-channel-surface text-channel-primary-dark font-medium"
            >
              {t}
            </span>
          ))}
          <a
            href={article.url}
            target="_blank"
            rel="noopener noreferrer"
            className="ml-auto flex items-center gap-1 text-xs text-text-muted hover:text-channel-primary transition-colors"
          >
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </div>
    </article>
  );
}

export default function FeedTemplate({ articles }: Props) {
  return (
    <div className="space-y-3">
      {articles.map((article, i) => (
        <FeedItem key={i} article={article} index={i} />
      ))}
    </div>
  );
}
