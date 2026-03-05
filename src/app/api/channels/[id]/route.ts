import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import type { ChannelConfig } from "@/lib/types";

const CHANNELS_PATH = path.join(process.cwd(), "data", "channels.json");

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const raw = fs.readFileSync(CHANNELS_PATH, "utf-8");
  const channels: ChannelConfig[] = JSON.parse(raw);
  const filtered = channels.filter((c) => c.id !== id);
  if (filtered.length === channels.length) {
    return NextResponse.json({ error: "Channel not found" }, { status: 404 });
  }
  fs.writeFileSync(CHANNELS_PATH, JSON.stringify(filtered, null, 2), "utf-8");
  return NextResponse.json({ success: true, remaining: filtered.length });
}
