import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { db } from "@/lib/db";
import { channels } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import type { ChannelConfig } from "@/lib/types";

export async function POST(req: NextRequest) {
  try {
    const newChannel: ChannelConfig = await req.json();

    if (!newChannel.id || !newChannel.name) {
      return NextResponse.json({ error: "Missing id or name" }, { status: 400 });
    }

    const values = {
      id: newChannel.id,
      name: newChannel.name,
      nameEn: newChannel.nameEn,
      description: newChannel.description,
      icon: newChannel.icon,
      template: newChannel.template,
      colorScheme: newChannel.colorScheme,
      keywords: newChannel.keywords,
      sources: newChannel.sources,
      searchPrompt: newChannel.searchPrompt,
      agentCombo: newChannel.agentCombo,
      integrationModel: newChannel.integrationModel,
      createdAt: newChannel.createdAt || new Date().toISOString(),
      modelBindings: newChannel.modelBindings ?? null,
      integrationBinding: newChannel.integrationBinding ?? null,
    };

    const existing = db.select({ id: channels.id }).from(channels).where(eq(channels.id, newChannel.id)).get();

    if (existing) {
      db.update(channels).set(values).where(eq(channels.id, newChannel.id)).run();
    } else {
      db.insert(channels).values(values).run();
    }

    const total = db.select({ id: channels.id }).from(channels).all().length;

    // Ensure data directory for the channel exists (pipeline writes JSON there too)
    const channelDir = path.join(process.cwd(), "data", newChannel.id);
    if (!fs.existsSync(channelDir)) {
      fs.mkdirSync(channelDir, { recursive: true });
    }

    return NextResponse.json({ success: true, total });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
