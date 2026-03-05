/**
 * Web Search Tool — provides real search results with verified URLs.
 *
 * Primary: Gemini grounding → extract real URLs from groundingMetadata.groundingChunks
 * Optional: Serper API for higher quality results (if SERPER_API_KEY is set)
 */

export interface WebSearchResult {
  title: string;
  url: string;
  snippet: string;
}

const DEFAULT_SEARCH_MODEL = "gemini-2.5-flash";

// ─── Gemini Grounding Search ───────────────────────────────────

/**
 * Search via Gemini grounding — extract REAL URLs from groundingMetadata
 * instead of relying on model-generated (often hallucinated) URLs.
 */
export async function searchViaGemini(
  query: string,
  apiKey: string,
  baseUrl = "https://generativelanguage.googleapis.com/v1beta",
  model?: string,
): Promise<WebSearchResult[]> {
  const searchModel = model || DEFAULT_SEARCH_MODEL;
  const endpoint = `${baseUrl.replace(/\/+$/, "")}/models/${searchModel}:generateContent`;
  const isGoogleKey = apiKey.startsWith("AIza");
  const fetchUrl = isGoogleKey
    ? `${endpoint}?key=${apiKey}`
    : endpoint;

  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (!isGoogleKey) {
    headers["x-goog-api-key"] = apiKey;
  }

  const res = await fetch(fetchUrl, {
    method: "POST",
    headers,
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: query }] }],
      tools: [{ google_search: {} }],
      generationConfig: { maxOutputTokens: 1024, temperature: 0 },
    }),
    signal: AbortSignal.timeout(30_000),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Gemini search ${res.status}: ${text.slice(0, 200)}`);
  }

  const data = await res.json();
  const candidate = data.candidates?.[0];

  // Extract real URLs from groundingChunks
  const chunks: any[] = candidate?.groundingMetadata?.groundingChunks ?? [];
  const results: WebSearchResult[] = [];

  for (const chunk of chunks) {
    if (chunk.web?.uri) {
      results.push({
        title: chunk.web.title || "",
        url: chunk.web.uri,
        snippet: "",
      });
    }
  }

  // Fill snippets from groundingSupports
  const supports: any[] = candidate?.groundingMetadata?.groundingSupports ?? [];
  for (const support of supports) {
    const text = support.segment?.text || "";
    const indices: number[] = support.groundingChunkIndices ?? [];
    for (const idx of indices) {
      if (results[idx] && !results[idx].snippet && text) {
        results[idx].snippet = text;
      }
    }
  }

  // Fallback: if no grounding chunks, use response text as a single snippet
  if (results.length === 0) {
    const responseText = (candidate?.content?.parts ?? [])
      .filter((p: any) => p.text)
      .map((p: any) => p.text)
      .join("\n");
    if (responseText) {
      results.push({ title: query, url: "", snippet: responseText.slice(0, 500) });
    }
  }

  return results;
}

// ─── Serper API Search (optional) ──────────────────────────────

export async function searchViaSerper(
  query: string,
  apiKey: string,
  num = 10,
): Promise<WebSearchResult[]> {
  const res = await fetch("https://google.serper.dev/search", {
    method: "POST",
    headers: {
      "X-API-KEY": apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ q: query, num }),
    signal: AbortSignal.timeout(10_000),
  });

  if (!res.ok) throw new Error(`Serper ${res.status}`);
  const data = await res.json();

  return (data.organic ?? []).map((r: any) => ({
    title: r.title || "",
    url: r.link || "",
    snippet: r.snippet || "",
  }));
}

// ─── Unified Search ────────────────────────────────────────────

export async function webSearch(
  query: string,
  geminiApiKey: string,
  geminiBaseUrl?: string,
  geminiModel?: string,
  serperApiKey?: string,
): Promise<WebSearchResult[]> {
  if (serperApiKey) {
    try {
      return await searchViaSerper(query, serperApiKey);
    } catch (e) {
      console.log(`      [serper] failed: ${e instanceof Error ? e.message : e}, falling back to Gemini`);
    }
  }
  return searchViaGemini(query, geminiApiKey, geminiBaseUrl, geminiModel);
}
