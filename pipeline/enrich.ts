/**
 * Result Enrichment — Phase 3 of the improved search layer.
 *
 * 1. Resolve Google grounding redirect URLs → real URLs
 * 2. Validate URL reachability (HEAD check → _urlValid)
 * 3. Cross-dimension reference counting (_crossRefCount)
 * 4. Deduplicate by title similarity, preserving verification metadata
 */
import type { RawSearchItem } from "./types";

const CONCURRENCY = 6;
const GROUNDING_REDIRECT = "vertexaisearch.cloud.google.com/grounding-api-redirect";

// ─── URL Resolution ────────────────────────────────────────────

async function resolveOneUrl(url: string): Promise<string> {
  if (!url || !url.includes(GROUNDING_REDIRECT)) return url;
  try {
    const res = await fetch(url, {
      method: "HEAD", redirect: "manual",
      signal: AbortSignal.timeout(8_000),
    });
    const location = res.headers.get("location");
    if (location) return location;
    const res2 = await fetch(url, {
      method: "GET", redirect: "follow",
      signal: AbortSignal.timeout(8_000),
    });
    if (res2.url && res2.url !== url) return res2.url;
    return url;
  } catch {
    return url;
  }
}

// ─── URL Reachability Check ────────────────────────────────────

async function checkUrlReachable(url: string): Promise<boolean> {
  if (!url || url.startsWith("https://picsum.photos")) return false;
  if (url.includes(GROUNDING_REDIRECT)) return false;

  // Try HEAD first, fall back to GET with range header if HEAD fails/blocked
  for (const method of ["HEAD", "GET"] as const) {
    try {
      const headers: Record<string, string> = {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
      };
      // GET with range to avoid downloading full page
      if (method === "GET") headers["Range"] = "bytes=0-1024";

      const res = await fetch(url, {
        method,
        redirect: "follow",
        signal: AbortSignal.timeout(10_000),
        headers,
      });
      // 200, 206 (partial), or 301/302 followed = valid
      if (res.ok || res.status === 206) return true;
      // 405 Method Not Allowed for HEAD → try GET
      if (method === "HEAD" && (res.status === 405 || res.status === 403)) continue;
      return false;
    } catch {
      if (method === "HEAD") continue; // retry with GET
      return false;
    }
  }
  return false;
}

// ─── Title Similarity ─────────────────────────────────────────

export function titleSimilarity(a: string, b: string): number {
  const bigramsOf = (s: string): Set<string> => {
    const clean = s.replace(/\s+/g, "").toLowerCase();
    const set = new Set<string>();
    for (let i = 0; i < clean.length - 1; i++) {
      set.add(clean.slice(i, i + 2));
    }
    return set;
  };
  const setA = bigramsOf(a);
  const setB = bigramsOf(b);
  if (setA.size === 0 || setB.size === 0) return 0;
  let intersection = 0;
  for (const bg of setA) {
    if (setB.has(bg)) intersection++;
  }
  return intersection / (setA.size + setB.size - intersection);
}

// ─── Deduplication ─────────────────────────────────────────────

export function deduplicateItems(items: RawSearchItem[], threshold = 0.45): RawSearchItem[] {
  const kept: RawSearchItem[] = [];
  const removed = new Set<number>();

  for (let i = 0; i < items.length; i++) {
    if (removed.has(i)) continue;
    let best = items[i];
    for (let j = i + 1; j < items.length; j++) {
      if (removed.has(j)) continue;
      const sim = titleSimilarity(best.title, items[j].title);
      if (sim >= threshold) {
        // Prefer: validated URL > longer summary > earlier item
        const jBetter =
          (!best._urlValid && items[j]._urlValid) ||
          (best._urlValid === items[j]._urlValid && items[j].summary.length > best.summary.length);
        if (jBetter) best = items[j];
        removed.add(j);
      }
    }
    kept.push(best);
  }

  return kept;
}

// ─── Full Enrichment Pipeline ──────────────────────────────────

export async function enrichResults(items: RawSearchItem[]): Promise<RawSearchItem[]> {
  // Step 1: Resolve grounding redirect URLs
  for (let i = 0; i < items.length; i += CONCURRENCY) {
    const batch = items.slice(i, i + CONCURRENCY);
    const urls = await Promise.all(batch.map((item) => resolveOneUrl(item.url)));
    for (let j = 0; j < urls.length; j++) {
      items[i + j].url = urls[j];
    }
  }

  // Step 2: Validate URL reachability in parallel
  for (let i = 0; i < items.length; i += CONCURRENCY) {
    const batch = items.slice(i, i + CONCURRENCY);
    const checks = await Promise.all(batch.map((item) => checkUrlReachable(item.url)));
    for (let j = 0; j < checks.length; j++) {
      items[i + j]._urlValid = checks[j];
    }
  }

  // Step 3: Deduplicate (prefers items with valid URLs)
  return deduplicateItems(items);
}
