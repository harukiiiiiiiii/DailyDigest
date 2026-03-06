/**
 * Test DB setup — creates an isolated in-memory SQLite database
 * with the same schema as production, for each test run.
 */
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import * as schema from "../../src/lib/db/schema";

export function createTestDb() {
  const sqlite = new Database(":memory:");
  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("foreign_keys = ON");

  sqlite.exec(`
    CREATE TABLE channels (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      name_en TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      icon TEXT NOT NULL DEFAULT 'newspaper',
      template TEXT NOT NULL DEFAULT 'magazine',
      color_scheme TEXT NOT NULL DEFAULT 'ocean',
      keywords TEXT NOT NULL DEFAULT '[]',
      sources TEXT NOT NULL DEFAULT '[]',
      search_prompt TEXT NOT NULL DEFAULT '',
      agent_combo TEXT NOT NULL DEFAULT '[]',
      integration_model TEXT NOT NULL DEFAULT 'gemini',
      model_bindings TEXT,
      integration_binding TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE digests (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      channel_id TEXT NOT NULL REFERENCES channels(id) ON DELETE CASCADE,
      date TEXT NOT NULL,
      weekday TEXT NOT NULL,
      topic TEXT NOT NULL DEFAULT '',
      digest_text TEXT NOT NULL DEFAULT '',
      agents_used TEXT NOT NULL DEFAULT '[]',
      total_raw INTEGER NOT NULL DEFAULT 0,
      after_dedup INTEGER NOT NULL DEFAULT 0,
      final_selected INTEGER NOT NULL DEFAULT 0,
      generated_at TEXT NOT NULL,
      cost_usd REAL NOT NULL DEFAULT 0
    );

    CREATE TABLE articles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      digest_id INTEGER NOT NULL REFERENCES digests(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      summary TEXT NOT NULL,
      source TEXT NOT NULL,
      source_agents TEXT NOT NULL DEFAULT '[]',
      verified INTEGER NOT NULL DEFAULT 0,
      importance REAL NOT NULL DEFAULT 0,
      tags TEXT NOT NULL DEFAULT '[]',
      image TEXT NOT NULL DEFAULT '',
      url TEXT NOT NULL,
      context TEXT NOT NULL DEFAULT '',
      sort_order INTEGER NOT NULL DEFAULT 0
    );
  `);

  const db = drizzle(sqlite, { schema });
  return { db, sqlite };
}

export const SAMPLE_CHANNEL = {
  id: "test-ai",
  name: "AI 测试频道",
  nameEn: "AI Test Channel",
  description: "A test channel for unit tests",
  icon: "bot",
  template: "magazine",
  colorScheme: "ocean",
  keywords: ["AI", "LLM", "GPT"],
  sources: ["techcrunch.com", "theverge.com"],
  searchPrompt: "Latest AI news",
  agentCombo: ["gemini"],
  integrationModel: "gemini",
  createdAt: "2026-03-06T00:00:00.000Z",
  modelBindings: null,
  integrationBinding: null,
};

export const SAMPLE_DIGEST = {
  channelId: "test-ai",
  date: "2026-03-06",
  weekday: "周五",
  topic: "AI 行业动态",
  digestText: "今日 AI 领域有多项重要进展...",
  agentsUsed: ["gemini"],
  totalRaw: 20,
  afterDedup: 15,
  finalSelected: 8,
  generatedAt: "2026-03-06T08:00:00.000Z",
  costUsd: 0.0045,
};

export const SAMPLE_ARTICLES = [
  {
    title: "GPT-5 正式发布",
    summary: "OpenAI 发布了最新一代语言模型",
    source: "techcrunch.com",
    sourceAgents: ["gemini"],
    verified: true,
    importance: 0.95,
    tags: ["GPT", "OpenAI"],
    image: "https://picsum.photos/seed/test-1/800/400",
    url: "https://techcrunch.com/gpt5",
    context: "这是今日最重要的 AI 新闻",
    sortOrder: 0,
  },
  {
    title: "Google 发布 Gemini 3.0",
    summary: "Google 推出 Gemini 3.0 多模态模型",
    source: "theverge.com",
    sourceAgents: ["gemini"],
    verified: true,
    importance: 0.9,
    tags: ["Google", "Gemini"],
    image: "https://picsum.photos/seed/test-2/800/400",
    url: "https://theverge.com/gemini3",
    context: "与 GPT-5 形成竞争",
    sortOrder: 1,
  },
];
