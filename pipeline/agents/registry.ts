/**
 * Agent registry: maps agent IDs to concrete implementations.
 * Scheduler: runs selected agents in parallel with fault isolation.
 */
import type { SearchAgent, SearchContext } from "./base";
import type { SearchAgentId, AgentOutcome, AgentSearchError } from "../types";
import { isSearchResult } from "../types";
import { GrokAgent } from "./grok";
import { GeminiAgent } from "./gemini";
import { DoubaoAgent } from "./doubao";
import { PerplexityAgent } from "./perplexity";

const ALL_AGENTS: Record<SearchAgentId, SearchAgent> = {
  grok: new GrokAgent(),
  gemini: new GeminiAgent(),
  doubao: new DoubaoAgent(),
  perplexity: new PerplexityAgent(),
};

export function getAgent(id: SearchAgentId): SearchAgent {
  const agent = ALL_AGENTS[id];
  if (!agent) throw new Error(`Unknown agent: ${id}`);
  return agent;
}

export function listAgents(): SearchAgentId[] {
  return Object.keys(ALL_AGENTS) as SearchAgentId[];
}

/**
 * Run multiple search agents in parallel.
 * Uses Promise.allSettled — one agent failing does NOT block the others.
 * Returns both successes and errors so the caller can decide what to do.
 */
export async function runAgentsParallel(
  agentIds: SearchAgentId[],
  channelPrompt: string,
  ctx: SearchContext,
): Promise<AgentOutcome[]> {
  const tasks = agentIds.map(async (id): Promise<AgentOutcome> => {
    const agent = getAgent(id);
    const startTime = Date.now();
    try {
      const result = await agent.search(channelPrompt, ctx);
      console.log(
        `  ✓ ${agent.label}: ${result.items.length} items, ` +
        `$${result.costUsd.toFixed(4)}, ${result.durationMs}ms`,
      );
      return result;
    } catch (err) {
      const error: AgentSearchError = {
        agent: id,
        error: err instanceof Error ? err.message : String(err),
        durationMs: Date.now() - startTime,
      };
      console.error(`  ✗ ${agent.label}: ${error.error}`);
      return error;
    }
  });

  return Promise.all(tasks);
}

/**
 * Convenience: filter outcomes to only successful results.
 */
export function successfulResults(outcomes: AgentOutcome[]) {
  return outcomes.filter(isSearchResult);
}
