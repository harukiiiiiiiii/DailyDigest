"use client";

import type { Article, TemplateType, ColorScheme } from "@/lib/types";
import MagazineTemplate from "./MagazineTemplate";
import FeedTemplate from "./FeedTemplate";
import CardsTemplate from "./CardsTemplate";
import DashboardTemplate from "./DashboardTemplate";
import { ArticleModalProvider } from "@/components/ui/ArticleDetailModal";

interface TemplateRendererProps {
  template: TemplateType;
  articles: Article[];
  colorScheme: ColorScheme;
}

export default function TemplateRenderer({
  template,
  articles,
  colorScheme,
}: TemplateRendererProps) {
  const content = (() => {
    switch (template) {
      case "magazine":
        return <MagazineTemplate articles={articles} />;
      case "feed":
        return <FeedTemplate articles={articles} />;
      case "cards":
        return <CardsTemplate articles={articles} />;
      case "dashboard":
        return <DashboardTemplate articles={articles} />;
      default:
        return <FeedTemplate articles={articles} />;
    }
  })();

  return <ArticleModalProvider>{content}</ArticleModalProvider>;
}
