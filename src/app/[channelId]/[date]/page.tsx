import { notFound } from "next/navigation";
import { getAllChannels, getChannel } from "@/lib/channels";
import { getDailyDigest, getAvailableDates } from "@/lib/data";
import { getColorCSSVars } from "@/lib/colors";
import Header from "@/components/layout/Header";
import ChannelTabs from "@/components/layout/ChannelTabs";
import CalendarNav from "@/components/layout/CalendarNav";
import TemplateRenderer from "@/components/templates/TemplateRenderer";
import GenerateButton from "@/components/GenerateButton";

export default async function DigestPage({
  params,
}: {
  params: Promise<{ channelId: string; date: string }>;
}) {
  const { channelId, date } = await params;
  const channel = getChannel(channelId);
  if (!channel) notFound();

  const digest = getDailyDigest(channelId, date);
  const availableDates = getAvailableDates(channelId);
  const channels = getAllChannels();
  const colorVars = getColorCSSVars(channel.colorScheme);

  return (
    <div style={colorVars as React.CSSProperties}>
      <Header />
      <ChannelTabs channels={channels} currentDate={date} />

      <main className="max-w-7xl mx-auto px-4 sm:px-6">
        <CalendarNav
          channelId={channelId}
          currentDate={date}
          availableDates={availableDates}
        />

        {digest ? (
          <div className="pb-12">
            <div className="mb-8">
              <h1 className="text-2xl font-bold mb-2">{digest.topic}</h1>
              <p className="text-text-secondary leading-relaxed">
                {digest.digest}
              </p>
              <div className="flex items-center gap-4 mt-3 text-xs text-text-muted">
                <span>
                  来源 Agent：{digest.meta.agents_used.join(", ")}
                </span>
                <span>·</span>
                <span>
                  原始 {digest.meta.total_raw} 篇 → 去重{" "}
                  {digest.meta.after_dedup} 篇 → 精选{" "}
                  {digest.meta.final_selected} 篇
                </span>
              </div>
            </div>

            <TemplateRenderer
              template={channel.template}
              articles={digest.articles}
              colorScheme={channel.colorScheme}
            />
          </div>
        ) : (
          <GenerateButton
            channelId={channelId}
            channelName={channel.name}
            date={date}
          />
        )}
      </main>
    </div>
  );
}
