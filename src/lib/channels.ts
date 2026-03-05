import { db } from "./db";
import { channels } from "./db/schema";
import { eq } from "drizzle-orm";
import type { ChannelConfig } from "./types";

function rowToChannel(row: typeof channels.$inferSelect): ChannelConfig {
  return {
    id: row.id,
    name: row.name,
    nameEn: row.nameEn,
    description: row.description,
    icon: row.icon,
    template: row.template as ChannelConfig["template"],
    colorScheme: row.colorScheme as ChannelConfig["colorScheme"],
    keywords: row.keywords,
    sources: row.sources,
    searchPrompt: row.searchPrompt,
    agentCombo: row.agentCombo,
    integrationModel: row.integrationModel,
    createdAt: row.createdAt,
    modelBindings: row.modelBindings ?? undefined,
    integrationBinding: row.integrationBinding ?? undefined,
  };
}

export function getAllChannels(): ChannelConfig[] {
  return db.select().from(channels).all().map(rowToChannel);
}

export function getChannel(channelId: string): ChannelConfig | undefined {
  const row = db.select().from(channels).where(eq(channels.id, channelId)).get();
  return row ? rowToChannel(row) : undefined;
}

export function getDefaultChannelId(): string {
  const first = db.select({ id: channels.id }).from(channels).get();
  return first?.id ?? "ai";
}
