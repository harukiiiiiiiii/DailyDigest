import Link from "next/link";
import { Plus, ArrowRight, Calendar, Sparkles } from "lucide-react";
import { getAllChannels } from "@/lib/channels";
import { getDailyDigest, getAvailableDates } from "@/lib/data";
import { getTodayString, formatDate, formatWeekday } from "@/lib/date-utils";
import { getColorCSSVars, colorSchemes } from "@/lib/colors";
import { getIcon } from "@/lib/icons";
import Header from "@/components/layout/Header";

export default function HomePage() {
  const channels = getAllChannels();
  const today = getTodayString();
  const defaultColors = getColorCSSVars("ocean");

  return (
    <div style={defaultColors as React.CSSProperties}>
      <Header />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        {/* hero */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-channel-surface text-channel-primary text-xs font-medium mb-4">
            <Calendar className="w-3.5 h-3.5" />
            {formatDate(today)} {formatWeekday(today)}
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight mb-2">
            今日智讯
          </h1>
          <p className="text-text-secondary max-w-lg mx-auto">
            AI 驱动的多频道信息聚合，每天 5 分钟掌握全局
          </p>
        </div>

        {/* channel grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {channels.map((ch) => {
            const scheme = colorSchemes[ch.colorScheme];
            const colorVars = getColorCSSVars(ch.colorScheme);
            const Icon = getIcon(ch.icon);

            const dates = getAvailableDates(ch.id);
            const latestDate = dates.length > 0 ? dates[dates.length - 1] : null;
            const digest = latestDate ? getDailyDigest(ch.id, latestDate) : null;

            return (
              <Link
                key={ch.id}
                href={`/${ch.id}/${latestDate || today}`}
                className="group relative bg-white rounded-2xl shadow-sm hover:shadow-lg transition-all duration-300 overflow-hidden"
                style={colorVars as React.CSSProperties}
              >
                {/* gradient header */}
                <div
                  className="h-24 relative"
                  style={{
                    background: `linear-gradient(135deg, ${scheme.primary}, ${scheme.accent})`,
                  }}
                >
                  <div className="absolute inset-0 bg-black/10 group-hover:bg-black/5 transition-colors" />
                  <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-white to-transparent" />
                  <div className="absolute top-4 left-5 flex items-center gap-2.5">
                    <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center">
                      <Icon className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <div className="text-white font-bold text-lg leading-tight">
                        {ch.name}
                      </div>
                      <div className="text-white/70 text-xs">{ch.nameEn}</div>
                    </div>
                  </div>
                </div>

                {/* content */}
                <div className="px-5 pb-5 pt-2">
                  {digest ? (
                    <>
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-xs text-text-muted">
                          {latestDate === today ? "今日" : formatDate(latestDate!)}
                        </span>
                        <span className="text-xs font-medium text-channel-primary">
                          {digest.articles.length} 篇
                        </span>
                        {digest.articles.some((a) => a.verified) && (
                          <span className="text-xs text-emerald-500">
                            已验证
                          </span>
                        )}
                      </div>
                      <h3 className="text-sm font-semibold mb-1.5 line-clamp-1">
                        {digest.topic}
                      </h3>
                      <p className="text-xs text-text-secondary line-clamp-2 leading-relaxed mb-3">
                        {digest.digest}
                      </p>
                      <div className="flex flex-wrap gap-1">
                        {digest.articles
                          .slice(0, 3)
                          .flatMap((a) => a.tags.slice(0, 1))
                          .filter((t, i, arr) => arr.indexOf(t) === i)
                          .slice(0, 4)
                          .map((tag) => (
                            <span
                              key={tag}
                              className="text-xs px-2 py-0.5 rounded-full bg-channel-surface text-channel-primary-dark"
                            >
                              {tag}
                            </span>
                          ))}
                      </div>
                    </>
                  ) : (
                    <div className="py-4 text-center">
                      <p className="text-sm text-text-muted mb-1">暂无内容</p>
                      <p className="text-xs text-text-muted">
                        运行 Pipeline 生成今日数据
                      </p>
                    </div>
                  )}

                  <div className="flex items-center justify-end mt-3 text-xs text-text-muted group-hover:text-channel-primary transition-colors">
                    查看详情
                    <ArrowRight className="w-3.5 h-3.5 ml-1 group-hover:translate-x-0.5 transition-transform" />
                  </div>
                </div>
              </Link>
            );
          })}

          {/* create channel card */}
          <Link
            href="/create"
            className="group flex flex-col items-center justify-center bg-white rounded-2xl shadow-sm hover:shadow-lg
              border-2 border-dashed border-border hover:border-channel-primary
              transition-all duration-300 min-h-[240px]"
          >
            <div className="w-14 h-14 rounded-2xl bg-gray-50 group-hover:bg-channel-surface flex items-center justify-center mb-3 transition-colors">
              <Plus className="w-6 h-6 text-text-muted group-hover:text-channel-primary transition-colors" />
            </div>
            <span className="text-sm font-medium text-text-secondary group-hover:text-channel-primary transition-colors">
              创建新频道
            </span>
            <span className="text-xs text-text-muted mt-1">
              AI 引导式配置
            </span>
          </Link>
        </div>

        {/* footer info */}
        <div className="mt-12 text-center text-xs text-text-muted">
          <div className="flex items-center justify-center gap-1.5 mb-1">
            <Sparkles className="w-3.5 h-3.5" />
            <span>由 Gemini / Grok / Perplexity / 豆包 多 Agent 驱动</span>
          </div>
          <p>{channels.length} 个频道 · 数据与展示分离 · 模板驱动渲染</p>
        </div>
      </main>
    </div>
  );
}
