/**
 * Pipeline-specific types for the two-layer search + integration system.
 * Layer 1 (Search): Multiple agents search in parallel.
 * Layer 2 (Integration): A strong model merges, deduplicates, and outputs final JSON.
 */

// ─── Agent identifiers ───────────────────────────────────────────────
export type SearchAgentId = "grok" | "gemini" | "doubao" | "perplexity";
export type IntegrationModelId = "claude-opus" | "claude-sonnet" | "deepseek-r1" | "deepseek-chat" | "gemini";
export type AgentId = SearchAgentId | IntegrationModelId;

// ─── Layer 1: Raw search output ──────────────────────────────────────
export interface RawSearchItem {
  title: string;
  summary: string;
  source: string;
  url: string;
  relevance: string;
  /** Verification metadata (populated by enrich phase) */
  _dimension?: string;
  _urlValid?: boolean;
  _crossRefCount?: number;
}

export interface AgentSearchResult {
  agent: SearchAgentId;
  items: RawSearchItem[];
  usage: { inputTokens: number; outputTokens: number };
  costUsd: number;
  durationMs: number;
}

export interface AgentSearchError {
  agent: SearchAgentId;
  error: string;
  durationMs: number;
}

export type AgentOutcome = AgentSearchResult | AgentSearchError;

export function isSearchResult(o: AgentOutcome): o is AgentSearchResult {
  return "items" in o;
}

// ─── Layer 2: Integration output (matches DailyDigest schema) ────────
export interface IntegrationInput {
  channelName: string;
  channelDescription: string;
  date: string;
  weekday: string;
  searchPrompt: string;
  agentResults: AgentSearchResult[];
}

// Re-export front-end types we'll produce as final output
export type { DailyDigest, Article, ChannelConfig } from "../src/lib/types";

// ─── Pipeline-level config per run ───────────────────────────────────
export interface PipelineRunConfig {
  channelId: string;
  date: string;
  dryRun?: boolean;
}
