import { NextRequest, NextResponse } from "next/server";
import { getChannel } from "@/lib/channels";

export async function POST(req: NextRequest) {
  const { channelId, date } = await req.json();

  if (!channelId || !date) {
    return NextResponse.json({ error: "Missing channelId or date" }, { status: 400 });
  }

  const channel = getChannel(channelId);

  if (!channel) {
    return NextResponse.json({ error: `Channel "${channelId}" not found` }, { status: 404 });
  }

  try {
    // Dynamic import to avoid bundling pipeline into the client
    const { runChannel } = await import("../../../../pipeline/runner");

    channel.agentCombo = ["gemini"];
    channel.integrationModel = "gemini";

    const digest = await runChannel(channel, date, false, undefined, undefined);

    return NextResponse.json({
      success: true,
      articles: digest.articles.length,
      topic: digest.topic,
      cost: digest.meta.cost_usd,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`Pipeline failed for ${channelId}:`, msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
