import Header from "@/components/layout/Header";
import ChannelCreator from "@/components/creator/ChannelCreator";
import { getAllChannels } from "@/lib/channels";
import { getColorCSSVars } from "@/lib/colors";
import { getTodayString } from "@/lib/data";
import ChannelTabs from "@/components/layout/ChannelTabs";

export default function CreatePage() {
  const channels = getAllChannels();
  const today = getTodayString();
  const defaultColors = getColorCSSVars("ocean");

  return (
    <div style={defaultColors as React.CSSProperties}>
      <Header />
      <ChannelTabs channels={channels} currentDate={today} />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        <ChannelCreator />
      </main>
    </div>
  );
}
