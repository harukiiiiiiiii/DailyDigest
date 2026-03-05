import { db } from "./db";
import { digests, articles } from "./db/schema";
import { eq, and, asc, desc } from "drizzle-orm";
import type { DailyDigest } from "./types";

export { formatDate, formatWeekday, getTodayString, addDays } from "./date-utils";

export function getDailyDigest(channelId: string, date: string): DailyDigest | null {
  const digest = db
    .select()
    .from(digests)
    .where(and(eq(digests.channelId, channelId), eq(digests.date, date)))
    .orderBy(desc(digests.id))
    .get();

  if (!digest) return null;

  const arts = db
    .select()
    .from(articles)
    .where(eq(articles.digestId, digest.id))
    .orderBy(asc(articles.sortOrder))
    .all();

  return {
    date: digest.date,
    weekday: digest.weekday,
    channel: digest.channelId,
    topic: digest.topic,
    digest: digest.digestText,
    articles: arts.map((a) => ({
      title: a.title,
      summary: a.summary,
      source: a.source,
      sourceAgents: a.sourceAgents,
      verified: a.verified,
      importance: a.importance,
      tags: a.tags,
      image: a.image,
      url: a.url,
      context: a.context,
    })),
    meta: {
      agents_used: digest.agentsUsed,
      total_raw: digest.totalRaw,
      after_dedup: digest.afterDedup,
      final_selected: digest.finalSelected,
      generated_at: digest.generatedAt,
      cost_usd: digest.costUsd,
    },
  };
}

export function getAvailableDates(channelId: string): string[] {
  const rows = db
    .select({ date: digests.date })
    .from(digests)
    .where(eq(digests.channelId, channelId))
    .orderBy(asc(digests.date))
    .all();

  return rows.map((r) => r.date);
}
