import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import type { DailyDigest } from "@/lib/types";
import { getAllChannels } from "@/lib/channels";

const DATA_DIR = path.join(process.cwd(), "data");

export async function GET() {
  const channels = getAllChannels();
  const entries: Array<{ channel: string; date: string; cost: number; articles: number }> = [];

  for (const ch of channels) {
    const dir = path.join(DATA_DIR, ch.id);
    if (!fs.existsSync(dir)) continue;
    const files = fs.readdirSync(dir).filter((f) => f.endsWith(".json")).sort().reverse();
    for (const file of files) {
      try {
        const raw = fs.readFileSync(path.join(dir, file), "utf-8");
        const digest: DailyDigest = JSON.parse(raw);
        entries.push({
          channel: ch.name,
          date: digest.date,
          cost: digest.meta?.cost_usd ?? 0,
          articles: digest.articles?.length ?? 0,
        });
      } catch { /* skip malformed */ }
    }
  }

  entries.sort((a, b) => b.date.localeCompare(a.date));
  return NextResponse.json({ entries });
}
