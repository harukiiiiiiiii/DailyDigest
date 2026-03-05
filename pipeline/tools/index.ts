/**
 * Tool Registry — defines function declarations for Gemini function calling
 * and provides the executor that runs the actual tool implementations.
 */
import { webSearch, type WebSearchResult } from "./websearch";
import { crawlUrl, type CrawlResult } from "./crawler";

export type { WebSearchResult, CrawlResult };

// ─── Tool Function Declarations (Gemini format) ────────────────

export const TOOL_DECLARATIONS = [
  {
    function_declarations: [
      {
        name: "web_search",
        description:
          "Search the web using Google Search. Returns a list of real search results with titles, URLs, and snippets. Use this to find recent news, articles, and information. You can call this multiple times with different queries.",
        parameters: {
          type: "OBJECT",
          properties: {
            query: {
              type: "STRING",
              description:
                "The search query. Be specific and include date/time context for recent news. Can be in English or Chinese.",
            },
          },
          required: ["query"],
        },
      },
      {
        name: "crawl_url",
        description:
          "Fetch and read the content of a specific URL. Use this to verify that a news article is real, read full article text, or check if a URL is accessible. Returns page title and extracted text content.",
        parameters: {
          type: "OBJECT",
          properties: {
            url: {
              type: "STRING",
              description: "The full URL to fetch and read.",
            },
          },
          required: ["url"],
        },
      },
    ],
  },
];

// ─── Tool Configuration ────────────────────────────────────────

export interface ToolConfig {
  geminiApiKey: string;
  geminiBaseUrl?: string;
  geminiModel?: string;
  serperApiKey?: string;
}

// ─── Tool Executor ─────────────────────────────────────────────

export interface ToolCallResult {
  name: string;
  result: unknown;
}

export async function executeTool(
  name: string,
  args: Record<string, unknown>,
  config: ToolConfig,
): Promise<unknown> {
  switch (name) {
    case "web_search": {
      const query = args.query as string;
      const results = await webSearch(
        query,
        config.geminiApiKey,
        config.geminiBaseUrl,
        config.geminiModel,
        config.serperApiKey,
      );
      return { query, results, count: results.length };
    }
    case "crawl_url": {
      const url = args.url as string;
      return await crawlUrl(url);
    }
    default:
      return { error: `Unknown tool: ${name}` };
  }
}

/**
 * Execute multiple tool calls in parallel.
 */
export async function executeToolCalls(
  calls: Array<{ name: string; args: Record<string, unknown> }>,
  config: ToolConfig,
): Promise<ToolCallResult[]> {
  const results = await Promise.allSettled(
    calls.map(async (call) => ({
      name: call.name,
      result: await executeTool(call.name, call.args, config),
    })),
  );

  return results.map((r, i) => {
    if (r.status === "fulfilled") return r.value;
    return {
      name: calls[i].name,
      result: { error: r.reason?.message ?? String(r.reason) },
    };
  });
}
