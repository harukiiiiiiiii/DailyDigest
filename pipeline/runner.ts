/**
 * Pipeline runner — orchestrates the full two-layer flow:
 *   1. Read channel config
 *   2. Run search agents in parallel
 *   3. Feed results to integration model
 *   4. Write final DailyDigest JSON to data/{channel}/{date}.json
 *
 * Usage:
 *   npx tsx pipeline/run.ts                     # all channels, today
 *   npx tsx pipeline/run.ts --channel ai         # single channel
 *   npx tsx pipeline/run.ts --date 2026-03-04    # specific date
 *   npx tsx pipeline/run.ts --dry-run            # print results, don't write
 */
import fs from "fs";
import path from "path";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { eq, and } from "drizzle-orm";
import * as schema from "../src/lib/db/schema";
import type { ChannelConfig, DailyDigest, SearchAgentId, IntegrationModelId } from "./types";
import { runAgentsParallel, successfulResults } from "./agents/registry";
import { integrate } from "./integrator";
import type { SearchContext } from "./agents/base";

import { enrichResults } from "./enrich";

const DATA_DIR = path.join(process.cwd(), "data");
const DB_PATH = path.join(DATA_DIR, "digest.db");

function getDb() {
  const sqlite = new Database(DB_PATH);
  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("foreign_keys = ON");
  return drizzle(sqlite, { schema });
}

// ─── Helpers ──────────────────────────────────────────────────
export function loadChannels(): ChannelConfig[] {
  // Try DB first, fallback to JSON
  try {
    const pipelineDb = getDb();
    const rows = pipelineDb.select().from(schema.channels).all();
    if (rows.length > 0) {
      return rows.map((r) => ({
        id: r.id,
        name: r.name,
        nameEn: r.nameEn,
        description: r.description,
        icon: r.icon,
        template: r.template,
        colorScheme: r.colorScheme,
        keywords: r.keywords,
        sources: r.sources,
        searchPrompt: r.searchPrompt,
        agentCombo: r.agentCombo,
        integrationModel: r.integrationModel,
        createdAt: r.createdAt,
        modelBindings: r.modelBindings ?? undefined,
        integrationBinding: r.integrationBinding ?? undefined,
      })) as ChannelConfig[];
    }
  } catch { /* fallback to JSON */ }
  const raw = fs.readFileSync(path.join(DATA_DIR, "channels.json"), "utf-8");
  return JSON.parse(raw);
}

function todayString(): string {
  return new Date().toISOString().split("T")[0];
}

function weekdayOf(dateStr: string): string {
  const days = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];
  return days[new Date(dateStr + "T00:00:00").getDay()];
}

function ensureDir(dir: string) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

// ─── Progress Events ─────────────────────────────────────────
export type ProgressEvent =
  | { phase: "search_start"; agents: string[] }
  | { phase: "search_iteration"; agent: string; iteration: number; tools: number }
  | { phase: "search_tool"; agent: string; tool: string; query?: string; url?: string }
  | { phase: "search_tool_result"; agent: string; tool: string; count?: number; success?: boolean; title?: string }
  | { phase: "search_done"; agent: string; items: number; cost: number; durationMs: number }
  | { phase: "enrich_start" }
  | { phase: "enrich_done"; raw: number; enriched: number; verified: number }
  | { phase: "integrate_start" }
  | { phase: "integrate_done"; articles: number; cost: number; durationMs: number }
  | { phase: "write_start" }
  | { phase: "done"; articles: number; totalCost: number }
  | { phase: "error"; message: string };

export type OnProgress = (event: ProgressEvent) => void;

// ─── Run a single channel ─────────────────────────────────────
export async function runChannel(
  channel: ChannelConfig,
  date: string,
  dryRun = false,
  agentModelOverrides?: Record<string, string>,
  integrationModelName?: string,
  onProgress?: OnProgress,
): Promise<DailyDigest> {
  const weekday = weekdayOf(date);
  console.log(`\n▶ ${channel.name} (${channel.id}) — ${date} ${weekday}`);

  const agentIds = channel.agentCombo as SearchAgentId[];
  const channelConfig = channel as typeof channel & {
    modelBindings?: Record<string, { providerId: string; modelId: string }>;
    integrationBinding?: { providerId: string; modelId: string };
  };

  // ReAct agent handles planning internally — no external planner needed
  console.log("  ReAct search (planning + searching + verifying)...");
  onProgress?.({ phase: "search_start", agents: agentIds });
  const ctx: SearchContext = {
    channelName: channel.name,
    keywords: channel.keywords,
    sources: channel.sources,
    date,
    modelOverrides: agentModelOverrides,
    channelBindings: channelConfig.modelBindings,
  };

  const outcomes = await runAgentsParallel(agentIds, channel.searchPrompt, ctx);
  const results = successfulResults(outcomes);

  if (results.length === 0) {
    throw new Error(`All ${agentIds.length} agents failed for channel ${channel.id}`);
  }

  const totalRaw = results.reduce((s, r) => s + r.items.length, 0);

  // Enrich results (resolve URLs + validate + deduplicate)
  console.log("  Enriching & deduplicating...");
  onProgress?.({ phase: "enrich_start" });
  for (const r of results) {
    const before = r.items.length;
    r.items = await enrichResults(r.items);
    const validUrls = r.items.filter((it) => it._urlValid).length;
    console.log(
      `    [${r.agent}] ${before} → ${r.items.length} items | ` +
      `URL valid: ${validUrls}/${r.items.length}`
    );
  }

  const allItems = results.flatMap((r) => r.items);
  const totalAfterEnrich = allItems.length;
  const totalValid = allItems.filter((it) => it._urlValid).length;
  console.log(`  ✓ Search done: ${totalRaw} raw → ${totalAfterEnrich} enriched (${totalValid} URL verified)`);
  onProgress?.({ phase: "enrich_done", raw: totalRaw, enriched: totalAfterEnrich, verified: totalValid });

  // Guard: no search results → skip integration
  if (totalRaw === 0) {
    console.warn(`  ⚠ No search results found — skipping integration`);
    throw new Error(`No search results found for channel "${channel.name}". Check API key or try again.`);
  }

  // Layer 2: integration
  console.log("  Layer 2: integrating...");
  onProgress?.({ phase: "integrate_start" });
  const { digest, costUsd: integrationCost, durationMs } = await integrate({
    channelId: channel.id,
    channelName: channel.name,
    channelDescription: channel.description,
    date,
    weekday,
    searchPrompt: channel.searchPrompt,
    model: channel.integrationModel as IntegrationModelId,
    modelOverride: integrationModelName,
    channelBinding: channelConfig.integrationBinding,
    agentResults: results,
  });

  // fill placeholder images for empty ones
  digest.articles.forEach((article, i) => {
    if (!article.image) {
      const seed = `${channel.id}-${date}-${i}`;
      article.image = `https://picsum.photos/seed/${seed}/800/400`;
    }
  });

  // fill meta.cost_usd (search + integration)
  const searchCost = results.reduce((s, r) => s + r.costUsd, 0);
  digest.meta.cost_usd = parseFloat((searchCost + integrationCost).toFixed(6));

  console.log(
    `  ✓ Done: ${digest.articles.length} articles, ` +
    `$${digest.meta.cost_usd.toFixed(4)} total, ${durationMs}ms integration`,
  );
  onProgress?.({ phase: "integrate_done", articles: digest.articles.length, cost: digest.meta.cost_usd, durationMs });

  // Write output
  if (!dryRun) {
    onProgress?.({ phase: "write_start" });
    // Write to SQLite
    const pipelineDb = getDb();

    // Delete existing digest for same channel+date (upsert)
    const existing = pipelineDb
      .select({ id: schema.digests.id })
      .from(schema.digests)
      .where(and(eq(schema.digests.channelId, channel.id), eq(schema.digests.date, date)))
      .all();
    for (const e of existing) {
      pipelineDb.delete(schema.articles).where(eq(schema.articles.digestId, e.id)).run();
      pipelineDb.delete(schema.digests).where(eq(schema.digests.id, e.id)).run();
    }

    const inserted = pipelineDb
      .insert(schema.digests)
      .values({
        channelId: channel.id,
        date,
        weekday,
        topic: digest.topic,
        digestText: digest.digest,
        agentsUsed: digest.meta.agents_used,
        totalRaw: digest.meta.total_raw,
        afterDedup: digest.meta.after_dedup,
        finalSelected: digest.meta.final_selected,
        generatedAt: digest.meta.generated_at,
        costUsd: digest.meta.cost_usd,
      })
      .returning()
      .get();

    for (let i = 0; i < digest.articles.length; i++) {
      const a = digest.articles[i];
      pipelineDb
        .insert(schema.articles)
        .values({
          digestId: inserted.id,
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
          sortOrder: i,
        })
        .run();
    }

    // Also write JSON for backward compatibility
    const channelDir = path.join(DATA_DIR, channel.id);
    ensureDir(channelDir);
    const outPath = path.join(channelDir, `${date}.json`);
    fs.writeFileSync(outPath, JSON.stringify(digest, null, 2), "utf-8");
    console.log(`  📄 Written to DB (digest #${inserted.id}) + ${outPath}`);
  } else {
    console.log("  [dry-run] skipping write");
    console.log(JSON.stringify(digest, null, 2));
  }

  onProgress?.({ phase: "done", articles: digest.articles.length, totalCost: digest.meta.cost_usd });
  return digest;
}

// ─── Run all channels ─────────────────────────────────────────
export async function runAll(
  date: string,
  dryRun = false,
  agentsOverride?: string[],
  modelOverride?: string,
  agentModelOverrides?: Record<string, string>,
  integrationModelName?: string,
) {
  const channels = loadChannels();
  console.log(`\n━━━ Daily Digest Pipeline ━━━`);
  console.log(`Date: ${date} (${weekdayOf(date)})`);
  console.log(`Channels: ${channels.map((c) => c.name).join(", ")}`);

  const results: Array<{ channel: string; success: boolean; error?: string }> = [];

  for (const ch of channels) {
    if (agentsOverride) ch.agentCombo = agentsOverride;
    if (modelOverride) ch.integrationModel = modelOverride;
    try {
      await runChannel(ch, date, dryRun, agentModelOverrides, integrationModelName);
      results.push({ channel: ch.id, success: true });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`  ✗ ${ch.name} failed: ${msg}`);
      results.push({ channel: ch.id, success: false, error: msg });
    }
  }

  // Summary
  console.log("\n━━━ Summary ━━━");
  for (const r of results) {
    console.log(`  ${r.success ? "✓" : "✗"} ${r.channel}${r.error ? ` — ${r.error}` : ""}`);
  }

  const succeeded = results.filter((r) => r.success).length;
  console.log(`\n${succeeded}/${results.length} channels completed.\n`);
}
