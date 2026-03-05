"use client";

import { ExternalLink, CheckCircle } from "lucide-react";
import type { Article } from "@/lib/types";
import ArticleImage from "@/components/ui/ArticleImage";
import { useArticleModal } from "@/components/ui/ArticleDetailModal";

interface Props {
  articles: Article[];
}

function ArticleTag({ tag }: { tag: string }) {
  return (
    <span className="inline-block px-2 py-0.5 text-xs font-medium rounded-full bg-channel-surface text-channel-primary-dark">
      {tag}
    </span>
  );
}

function HeroArticle({ article }: { article: Article }) {
  const { openArticle } = useArticleModal();
  return (
    <article
      className="group relative rounded-2xl overflow-hidden bg-white shadow-sm hover:shadow-lg transition-shadow duration-300 cursor-pointer"
      onClick={() => openArticle(article)}
    >
      <div className="aspect-[21/9] relative overflow-hidden">
        <ArticleImage
          src={article.image}
          alt={article.title}
          fallbackSeed={`hero-${article.title.slice(0,10)}`}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 p-6 sm:p-8">
          <div className="flex items-center gap-2 mb-3">
            {article.verified && (
              <span className="flex items-center gap-1 text-xs text-emerald-300 font-medium">
                <CheckCircle className="w-3.5 h-3.5" />
                已验证
              </span>
            )}
            <span className="text-xs text-white/70">{article.source}</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-white leading-snug mb-2">
            {article.title}
          </h2>
          <p className="text-sm text-white/80 line-clamp-2 max-w-2xl">
            {article.summary}
          </p>
        </div>
      </div>
      <div className="p-5 sm:p-6">
        <p className="text-sm text-text-secondary leading-relaxed mb-4">
          {article.context}
        </p>
        <div className="flex items-center justify-between">
          <div className="flex flex-wrap gap-1.5">
            {article.tags.map((t) => (
              <ArticleTag key={t} tag={t} />
            ))}
          </div>
          <a
            href={article.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-xs text-channel-primary hover:underline"
          >
            原文 <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </div>
    </article>
  );
}

function SideArticle({ article }: { article: Article }) {
  const { openArticle } = useArticleModal();
  return (
    <article
      className="group bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-300 cursor-pointer"
      onClick={() => openArticle(article)}
    >
      <div className="aspect-[16/9] relative overflow-hidden">
        <ArticleImage
          src={article.image}
          alt={article.title}
          fallbackSeed={`side-${article.title.slice(0,10)}`}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
        />
        {article.verified && (
          <div className="absolute top-3 right-3">
            <CheckCircle className="w-4 h-4 text-emerald-400 drop-shadow" />
          </div>
        )}
      </div>
      <div className="p-4">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-xs text-text-muted">{article.source}</span>
          <div className="w-1 h-1 rounded-full bg-border" />
          <span className="text-xs font-medium text-channel-primary">
            {Math.round(article.importance * 100)}%
          </span>
        </div>
        <h3 className="font-semibold text-sm leading-snug mb-2 line-clamp-2 group-hover:text-channel-primary transition-colors">
          {article.title}
        </h3>
        <p className="text-xs text-text-secondary line-clamp-3 leading-relaxed mb-3">
          {article.summary}
        </p>
        <div className="flex flex-wrap gap-1">
          {article.tags.slice(0, 2).map((t) => (
            <ArticleTag key={t} tag={t} />
          ))}
        </div>
      </div>
    </article>
  );
}

export default function MagazineTemplate({ articles }: Props) {
  if (articles.length === 0) return null;
  const [hero, ...rest] = articles;

  return (
    <div className="space-y-6">
      <HeroArticle article={hero} />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        {rest.map((article, i) => (
          <SideArticle key={i} article={article} />
        ))}
      </div>
    </div>
  );
}
