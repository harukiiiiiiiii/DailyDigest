"use client";

import { ExternalLink, CheckCircle } from "lucide-react";
import type { Article } from "@/lib/types";
import ArticleImage from "@/components/ui/ArticleImage";
import { useArticleModal } from "@/components/ui/ArticleDetailModal";

interface Props {
  articles: Article[];
}

function Card({ article }: { article: Article }) {
  const { openArticle } = useArticleModal();
  return (
    <article
      className="group bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-300 cursor-pointer"
      onClick={() => openArticle(article)}
    >
      <div className="aspect-[4/3] relative overflow-hidden">
        <ArticleImage
          src={article.image}
          alt={article.title}
          fallbackSeed={`card-${article.title.slice(0,10)}`}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
        <div className="absolute top-3 left-3 flex items-center gap-1.5">
          {article.verified && (
            <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/90 text-white text-xs font-medium">
              <CheckCircle className="w-3 h-3" />
              验证
            </span>
          )}
        </div>
        <div className="absolute top-3 right-3">
          <span className="px-2 py-0.5 rounded-full bg-black/40 text-white text-xs font-medium backdrop-blur-sm">
            {Math.round(article.importance * 100)}%
          </span>
        </div>
      </div>
      <div className="p-4">
        <div className="text-xs text-text-muted mb-1.5">{article.source}</div>
        <h3 className="font-semibold text-sm leading-snug mb-2 line-clamp-2 group-hover:text-channel-primary transition-colors">
          {article.title}
        </h3>
        <p className="text-xs text-text-secondary line-clamp-3 leading-relaxed mb-3">
          {article.summary}
        </p>
        <div className="flex items-center justify-between">
          <div className="flex flex-wrap gap-1">
            {article.tags.slice(0, 2).map((t) => (
              <span
                key={t}
                className="text-xs px-2 py-0.5 rounded-full bg-channel-surface text-channel-primary-dark font-medium"
              >
                {t}
              </span>
            ))}
          </div>
          <a
            href={article.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-text-muted hover:text-channel-primary transition-colors"
          >
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>
    </article>
  );
}

export default function CardsTemplate({ articles }: Props) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
      {articles.map((article, i) => (
        <Card key={i} article={article} />
      ))}
    </div>
  );
}
