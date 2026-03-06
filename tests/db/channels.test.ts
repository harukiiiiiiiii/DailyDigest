import { describe, it, expect, beforeEach } from "vitest";
import { eq } from "drizzle-orm";
import { channels } from "../../src/lib/db/schema";
import { createTestDb, SAMPLE_CHANNEL } from "./setup";

describe("Channels DB operations", () => {
  let db: ReturnType<typeof createTestDb>["db"];

  beforeEach(() => {
    ({ db } = createTestDb());
  });

  it("inserts a new channel", () => {
    db.insert(channels).values(SAMPLE_CHANNEL).run();
    const all = db.select().from(channels).all();
    expect(all).toHaveLength(1);
    expect(all[0].id).toBe("test-ai");
    expect(all[0].name).toBe("AI 测试频道");
  });

  it("reads channel by id", () => {
    db.insert(channels).values(SAMPLE_CHANNEL).run();
    const row = db.select().from(channels).where(eq(channels.id, "test-ai")).get();
    expect(row).toBeDefined();
    expect(row!.nameEn).toBe("AI Test Channel");
    expect(row!.keywords).toEqual(["AI", "LLM", "GPT"]);
  });

  it("returns undefined for non-existent channel", () => {
    const row = db.select().from(channels).where(eq(channels.id, "nope")).get();
    expect(row).toBeUndefined();
  });

  it("updates an existing channel", () => {
    db.insert(channels).values(SAMPLE_CHANNEL).run();
    db.update(channels)
      .set({ name: "AI 频道 (已更新)", description: "Updated description" })
      .where(eq(channels.id, "test-ai"))
      .run();

    const row = db.select().from(channels).where(eq(channels.id, "test-ai")).get();
    expect(row!.name).toBe("AI 频道 (已更新)");
    expect(row!.description).toBe("Updated description");
  });

  it("deletes a channel", () => {
    db.insert(channels).values(SAMPLE_CHANNEL).run();
    db.delete(channels).where(eq(channels.id, "test-ai")).run();
    const all = db.select().from(channels).all();
    expect(all).toHaveLength(0);
  });

  it("handles multiple channels", () => {
    db.insert(channels).values(SAMPLE_CHANNEL).run();
    db.insert(channels).values({
      ...SAMPLE_CHANNEL,
      id: "finance",
      name: "财经频道",
      nameEn: "Finance",
    }).run();

    const all = db.select().from(channels).all();
    expect(all).toHaveLength(2);
  });

  it("stores and retrieves JSON fields correctly", () => {
    db.insert(channels).values(SAMPLE_CHANNEL).run();
    const row = db.select().from(channels).where(eq(channels.id, "test-ai")).get();

    expect(Array.isArray(row!.keywords)).toBe(true);
    expect(row!.keywords).toContain("AI");
    expect(Array.isArray(row!.sources)).toBe(true);
    expect(row!.sources).toContain("techcrunch.com");
    expect(Array.isArray(row!.agentCombo)).toBe(true);
    expect(row!.agentCombo).toContain("gemini");
  });
});
