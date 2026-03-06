import type { SearchAgentId, AgentSearchResult, RawSearchItem } from "../types";
import type { AgentApiConfig } from "../config";
import { calcCost } from "../config";

/**
 * Every search agent must implement this interface.
 * The contract: given a search prompt and channel context,
 * return an array of raw news items from the web.
 */
export interface SearchAgent {
  readonly id: SearchAgentId;
  readonly label: string;
  search(prompt: string, context: SearchContext): Promise<AgentSearchResult>;
}

export interface SearchContext {
  channelName: string;
  keywords: string[];
  sources: string[];
  date: string;
  /** Per-agent model name overrides from CLI, e.g. { gemini: "gemini-2.0-flash" } */
  modelOverrides?: Record<string, string>;
  /** Per-agent provider+model bindings from channel config */
  channelBindings?: Record<string, { providerId: string; modelId: string }>;
  /** Targeted sub-queries from the query planner (Phase 1) */
  subQueries?: Array<{ query: string; lang: "zh" | "en"; dimension: string }>;
}

/**
 * Helper: parse a JSON array of RawSearchItem from model output.
 * Handles: multiple markdown fences, duplicated blocks, partial JSON.
 */
export function parseItemsFromText(text: string): RawSearchItem[] {
  // Strategy: try multiple extraction methods, return first success

  // 1. Extract ALL fenced code blocks and try each
  const fenceRegex = /```(?:json)?\s*\n?([\s\S]*?)```/g;
  let match;
  while ((match = fenceRegex.exec(text)) !== null) {
    const items = tryParseArray(match[1].trim());
    if (items.length > 0) return items;
  }

  // 2. Find the largest [...] span in the raw text
  const items = tryParseArray(text);
  if (items.length > 0) return items;

  // 3. Try bracket-matching to find a valid JSON array
  const arrStart = text.indexOf("[");
  if (arrStart !== -1) {
    let depth = 0;
    for (let i = arrStart; i < text.length; i++) {
      if (text[i] === "[") depth++;
      else if (text[i] === "]") depth--;
      if (depth === 0) {
        const candidate = text.slice(arrStart, i + 1);
        const items = tryParseArray(candidate);
        if (items.length > 0) return items;
        break;
      }
    }
  }

  // 4. Truncated JSON repair: try to close incomplete array
  if (arrStart !== -1) {
    const repaired = repairTruncatedArray(text.slice(arrStart));
    if (repaired) {
      const items = tryParseArray(repaired);
      if (items.length > 0) return items;
    }
  }

  return [];
}

/**
 * Attempt to repair a truncated JSON array by finding the last complete object
 * and closing the array. Handles cases where the model output was cut off.
 */
function repairTruncatedArray(text: string): string | null {
  // Find positions of all complete objects (ending with "}")
  let lastCompleteEnd = -1;
  let depth = 0;
  let inString = false;
  let escape = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (escape) { escape = false; continue; }
    if (ch === "\\") { escape = true; continue; }
    if (ch === '"') { inString = !inString; continue; }
    if (inString) continue;

    if (ch === "{") depth++;
    else if (ch === "}") {
      depth--;
      if (depth === 0) lastCompleteEnd = i;
    }
  }

  if (lastCompleteEnd <= 0) return null;

  // Slice up to last complete object, close the array
  const candidate = text.slice(0, lastCompleteEnd + 1).trimEnd();
  // Remove any trailing comma
  const cleaned = candidate.replace(/,\s*$/, "");
  return cleaned + "\n]";
}

function tryParseArray(text: string): RawSearchItem[] {
  const trimmed = text.trim();
  const arrStart = trimmed.indexOf("[");
  const arrEnd = trimmed.lastIndexOf("]");
  if (arrStart === -1 || arrEnd <= arrStart) return [];

  try {
    const parsed = JSON.parse(trimmed.slice(arrStart, arrEnd + 1));
    if (!Array.isArray(parsed) || parsed.length === 0) return [];
    return parsed
      .filter((item: Record<string, unknown>) => item && item.title)
      .map((item: Record<string, unknown>) => ({
        title: String(item.title ?? ""),
        summary: String(item.summary ?? ""),
        source: String(item.source ?? ""),
        url: String(item.url ?? ""),
        relevance: String(item.relevance ?? ""),
      }));
  } catch {
    return [];
  }
}

/**
 * Helper: build a successful AgentSearchResult from parsed items + usage.
 */
export function buildResult(
  agent: SearchAgentId,
  items: RawSearchItem[],
  usage: { inputTokens: number; outputTokens: number },
  cfg: AgentApiConfig,
  startTime: number,
): AgentSearchResult {
  return {
    agent,
    items,
    usage,
    costUsd: calcCost(usage, cfg),
    durationMs: Date.now() - startTime,
  };
}
