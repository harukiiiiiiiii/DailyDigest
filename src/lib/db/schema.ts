/**
 * Database schema — SQLite tables for business data.
 *
 * Auth tables (user, session, account, verification) are managed by Better Auth
 * via its built-in Kysely adapter — do NOT define them here.
 *
 * Business tables (channels, digests, articles) store the daily digest data.
 */
import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";

// ─── Business Tables ─────────────────────────────────────────

export const channels = sqliteTable("channels", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  nameEn: text("name_en").notNull(),
  description: text("description").notNull().default(""),
  icon: text("icon").notNull().default("newspaper"),
  template: text("template").notNull().default("magazine"),
  colorScheme: text("color_scheme").notNull().default("ocean"),
  keywords: text("keywords", { mode: "json" }).notNull().$type<string[]>(),
  sources: text("sources", { mode: "json" }).notNull().$type<string[]>(),
  searchPrompt: text("search_prompt").notNull().default(""),
  agentCombo: text("agent_combo", { mode: "json" }).notNull().$type<string[]>(),
  integrationModel: text("integration_model").notNull().default("gemini"),
  modelBindings: text("model_bindings", { mode: "json" }).$type<Record<string, { providerId: string; modelId: string }>>(),
  integrationBinding: text("integration_binding", { mode: "json" }).$type<{ providerId: string; modelId: string }>(),
  createdAt: text("created_at").notNull(),
});

export const digests = sqliteTable("digests", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  channelId: text("channel_id")
    .notNull()
    .references(() => channels.id, { onDelete: "cascade" }),
  date: text("date").notNull(),
  weekday: text("weekday").notNull(),
  topic: text("topic").notNull().default(""),
  digestText: text("digest_text").notNull().default(""),
  agentsUsed: text("agents_used", { mode: "json" }).notNull().$type<string[]>(),
  totalRaw: integer("total_raw").notNull().default(0),
  afterDedup: integer("after_dedup").notNull().default(0),
  finalSelected: integer("final_selected").notNull().default(0),
  generatedAt: text("generated_at").notNull(),
  costUsd: real("cost_usd").notNull().default(0),
});

export const articles = sqliteTable("articles", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  digestId: integer("digest_id")
    .notNull()
    .references(() => digests.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  summary: text("summary").notNull(),
  source: text("source").notNull(),
  sourceAgents: text("source_agents", { mode: "json" }).notNull().$type<string[]>(),
  verified: integer("verified", { mode: "boolean" }).notNull().default(false),
  importance: real("importance").notNull().default(0),
  tags: text("tags", { mode: "json" }).notNull().$type<string[]>(),
  image: text("image").notNull().default(""),
  url: text("url").notNull(),
  context: text("context").notNull().default(""),
  sortOrder: integer("sort_order").notNull().default(0),
});
