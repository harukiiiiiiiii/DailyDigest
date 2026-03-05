/**
 * Migration script — import existing JSON files into SQLite database.
 *
 * Usage: npx tsx scripts/migrate-to-db.ts
 */
import fs from "fs";
import path from "path";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import * as schema from "../src/lib/db/schema";

const DATA_DIR = path.join(process.cwd(), "data");
const DB_PATH = path.join(DATA_DIR, "digest.db");

const sqlite = new Database(DB_PATH);
sqlite.pragma("journal_mode = WAL");
sqlite.pragma("foreign_keys = ON");
const db = drizzle(sqlite, { schema });

// ─── Migrate Channels ────────────────────────────────────────

function migrateChannels() {
  const channelsPath = path.join(DATA_DIR, "channels.json");
  if (!fs.existsSync(channelsPath)) {
    console.log("⚠ No channels.json found, skipping channels migration");
    return;
  }

  const channels = JSON.parse(fs.readFileSync(channelsPath, "utf-8"));
  let count = 0;

  for (const ch of channels) {
    db.insert(schema.channels)
      .values({
        id: ch.id,
        name: ch.name,
        nameEn: ch.nameEn || ch.id,
        description: ch.description || "",
        icon: ch.icon || "newspaper",
        template: ch.template || "magazine",
        colorScheme: ch.colorScheme || "ocean",
        keywords: ch.keywords || [],
        sources: ch.sources || [],
        searchPrompt: ch.searchPrompt || "",
        agentCombo: ch.agentCombo || ["gemini"],
        integrationModel: ch.integrationModel || "gemini",
        modelBindings: ch.modelBindings || null,
        integrationBinding: ch.integrationBinding || null,
        createdAt: ch.createdAt || new Date().toISOString(),
      })
      .onConflictDoNothing()
      .run();
    count++;
  }

  console.log(`✓ Migrated ${count} channels`);
}

// ─── Migrate Digests & Articles ──────────────────────────────

function migrateDigests() {
  const channelDirs = fs
    .readdirSync(DATA_DIR, { withFileTypes: true })
    .filter((d) => d.isDirectory() && d.name !== "node_modules");

  let digestCount = 0;
  let articleCount = 0;

  for (const dir of channelDirs) {
    const channelId = dir.name;
    const channelDir = path.join(DATA_DIR, channelId);
    const jsonFiles = fs
      .readdirSync(channelDir)
      .filter((f) => f.endsWith(".json") && /^\d{4}-\d{2}-\d{2}\.json$/.test(f));

    for (const file of jsonFiles) {
      try {
        const raw = fs.readFileSync(path.join(channelDir, file), "utf-8");
        const data = JSON.parse(raw);

        // Check if channel exists in DB, if not skip
        const channelExists = db
          .select()
          .from(schema.channels)
          .where(
            require("drizzle-orm").eq(schema.channels.id, channelId),
          )
          .get();

        if (!channelExists) {
          console.log(`  ⚠ Channel "${channelId}" not in DB, skipping ${file}`);
          continue;
        }

        // Insert digest
        const result = db
          .insert(schema.digests)
          .values({
            channelId: data.channel || channelId,
            date: data.date,
            weekday: data.weekday || "",
            topic: data.topic || "",
            digestText: data.digest || "",
            agentsUsed: data.meta?.agents_used || [],
            totalRaw: data.meta?.total_raw || 0,
            afterDedup: data.meta?.after_dedup || 0,
            finalSelected: data.meta?.final_selected || 0,
            generatedAt: data.meta?.generated_at || new Date().toISOString(),
            costUsd: data.meta?.cost_usd || 0,
          })
          .returning()
          .get();

        digestCount++;

        // Insert articles
        if (data.articles && Array.isArray(data.articles)) {
          for (let i = 0; i < data.articles.length; i++) {
            const article = data.articles[i];
            db.insert(schema.articles)
              .values({
                digestId: result.id,
                title: article.title || "",
                summary: article.summary || "",
                source: article.source || "",
                sourceAgents: article.sourceAgents || [],
                verified: article.verified || false,
                importance: article.importance || 0,
                tags: article.tags || [],
                image: article.image || "",
                url: article.url || "",
                context: article.context || "",
                sortOrder: i,
              })
              .run();
            articleCount++;
          }
        }
      } catch (e) {
        console.error(`  ✗ Error migrating ${channelId}/${file}:`, e);
      }
    }
  }

  console.log(`✓ Migrated ${digestCount} digests, ${articleCount} articles`);
}

// ─── Run ─────────────────────────────────────────────────────

console.log("━━━ Migrating JSON files to SQLite ━━━");
console.log(`Database: ${DB_PATH}\n`);

migrateChannels();
migrateDigests();

sqlite.close();
console.log("\n✓ Migration complete!");
