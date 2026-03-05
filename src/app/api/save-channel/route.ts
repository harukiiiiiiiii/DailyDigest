import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import type { ChannelConfig } from "@/lib/types";

const CHANNELS_PATH = path.join(process.cwd(), "data", "channels.json");

export async function POST(req: NextRequest) {
  try {
    const newChannel: ChannelConfig = await req.json();

    if (!newChannel.id || !newChannel.name) {
      return NextResponse.json({ error: "Missing id or name" }, { status: 400 });
    }

    const raw = fs.readFileSync(CHANNELS_PATH, "utf-8");
    const channels: ChannelConfig[] = JSON.parse(raw);

    const existingIdx = channels.findIndex((c) => c.id === newChannel.id);
    if (existingIdx >= 0) {
      channels[existingIdx] = newChannel;
    } else {
      channels.push(newChannel);
    }

    fs.writeFileSync(CHANNELS_PATH, JSON.stringify(channels, null, 2), "utf-8");

    const channelDir = path.join(process.cwd(), "data", newChannel.id);
    if (!fs.existsSync(channelDir)) {
      fs.mkdirSync(channelDir, { recursive: true });
    }

    return NextResponse.json({ success: true, total: channels.length });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
