import { describe, it, expect, beforeEach } from "vitest";
import { eq, and, asc, desc } from "drizzle-orm";
import { channels, digests, articles } from "../../src/lib/db/schema";
import { createTestDb, SAMPLE_CHANNEL, SAMPLE_DIGEST, SAMPLE_ARTICLES } from "./setup";

describe("Digests & Articles DB operations", () => {
  let db: ReturnType<typeof createTestDb>["db"];
  let digestId: number;

  beforeEach(() => {
    ({ db } = createTestDb());

    db.insert(channels).values(SAMPLE_CHANNEL).run();

    const inserted = db.insert(digests).values(SAMPLE_DIGEST).returning().get();
    digestId = inserted.id;

    for (const art of SAMPLE_ARTICLES) {
      db.insert(articles).values({ ...art, digestId }).run();
    }
  });

  it("inserts and reads a digest", () => {
    const digest = db
      .select()
      .from(digests)
      .where(and(eq(digests.channelId, "test-ai"), eq(digests.date, "2026-03-06")))
      .get();

    expect(digest).toBeDefined();
    expect(digest!.topic).toBe("AI 行业动态");
    expect(digest!.totalRaw).toBe(20);
    expect(digest!.costUsd).toBeCloseTo(0.0045);
  });

  it("reads articles for a digest in sort order", () => {
    const arts = db
      .select()
      .from(articles)
      .where(eq(articles.digestId, digestId))
      .orderBy(asc(articles.sortOrder))
      .all();

    expect(arts).toHaveLength(2);
    expect(arts[0].title).toBe("GPT-5 正式发布");
    expect(arts[1].title).toBe("Google 发布 Gemini 3.0");
  });

  it("cascades delete from channel to digests and articles", () => {
    db.delete(channels).where(eq(channels.id, "test-ai")).run();

    const remainingDigests = db.select().from(digests).all();
    const remainingArticles = db.select().from(articles).all();
    expect(remainingDigests).toHaveLength(0);
    expect(remainingArticles).toHaveLength(0);
  });

  it("cascades delete from digest to articles", () => {
    db.delete(digests).where(eq(digests.id, digestId)).run();

    const remainingArticles = db.select().from(articles).all();
    expect(remainingArticles).toHaveLength(0);
  });

  it("returns available dates for a channel", () => {
    db.insert(digests).values({
      ...SAMPLE_DIGEST,
      date: "2026-03-05",
      generatedAt: "2026-03-05T08:00:00.000Z",
    }).run();

    const rows = db
      .select({ date: digests.date })
      .from(digests)
      .where(eq(digests.channelId, "test-ai"))
      .orderBy(asc(digests.date))
      .all();

    const dates = rows.map((r) => r.date);
    expect(dates).toEqual(["2026-03-05", "2026-03-06"]);
  });

  it("upserts digest (delete + insert) for same channel+date", () => {
    const existing = db
      .select({ id: digests.id })
      .from(digests)
      .where(and(eq(digests.channelId, "test-ai"), eq(digests.date, "2026-03-06")))
      .all();

    for (const e of existing) {
      db.delete(articles).where(eq(articles.digestId, e.id)).run();
      db.delete(digests).where(eq(digests.id, e.id)).run();
    }

    const newDigest = db.insert(digests).values({
      ...SAMPLE_DIGEST,
      topic: "Updated Topic",
      totalRaw: 30,
    }).returning().get();

    db.insert(articles).values({
      digestId: newDigest.id,
      title: "New Article",
      summary: "New summary",
      source: "new.com",
      sourceAgents: ["gemini"],
      verified: true,
      importance: 0.8,
      tags: ["new"],
      image: "",
      url: "https://new.com/article",
      context: "",
      sortOrder: 0,
    }).run();

    const allDigests = db
      .select()
      .from(digests)
      .where(and(eq(digests.channelId, "test-ai"), eq(digests.date, "2026-03-06")))
      .all();
    expect(allDigests).toHaveLength(1);
    expect(allDigests[0].topic).toBe("Updated Topic");

    const allArticles = db
      .select()
      .from(articles)
      .where(eq(articles.digestId, newDigest.id))
      .all();
    expect(allArticles).toHaveLength(1);
    expect(allArticles[0].title).toBe("New Article");
  });

  it("stores JSON array fields in articles correctly", () => {
    const art = db.select().from(articles).where(eq(articles.digestId, digestId)).get();
    expect(art).toBeDefined();
    expect(Array.isArray(art!.sourceAgents)).toBe(true);
    expect(art!.sourceAgents).toContain("gemini");
    expect(Array.isArray(art!.tags)).toBe(true);
  });

  it("retrieves latest digest when multiple exist", () => {
    db.insert(digests).values({
      ...SAMPLE_DIGEST,
      topic: "Older Topic",
      generatedAt: "2026-03-06T06:00:00.000Z",
    }).run();

    const latest = db
      .select()
      .from(digests)
      .where(and(eq(digests.channelId, "test-ai"), eq(digests.date, "2026-03-06")))
      .orderBy(desc(digests.id))
      .get();

    expect(latest).toBeDefined();
    // The later-inserted one should have a higher ID, but our original has the specific topic
    // In the upsert flow, old ones would be deleted — this tests the "latest by id" pattern
    expect(latest!.id).toBeGreaterThan(digestId);
  });
});
