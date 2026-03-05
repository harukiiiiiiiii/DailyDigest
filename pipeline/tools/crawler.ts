/**
 * Crawler Tool — fetches URL content and extracts readable text.
 * Used by the ReAct agent to verify search results and get full article content.
 */

export interface CrawlResult {
  url: string;
  title: string;
  content: string;
  success: boolean;
  statusCode?: number;
}

const MAX_CONTENT_LENGTH = 5000;

function extractTitle(html: string): string {
  const match = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  return match ? match[1].trim().replace(/\s+/g, " ") : "";
}

function extractText(html: string): string {
  let text = html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<nav[\s\S]*?<\/nav>/gi, "")
    .replace(/<footer[\s\S]*?<\/footer>/gi, "")
    .replace(/<header[\s\S]*?<\/header>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#\d+;/g, " ")
    .replace(/&[a-z]+;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();

  return text.slice(0, MAX_CONTENT_LENGTH);
}

export async function crawlUrl(url: string): Promise<CrawlResult> {
  if (!url) {
    return { url, title: "", content: "[Empty URL]", success: false };
  }

  try {
    const res = await fetch(url, {
      method: "GET",
      redirect: "follow",
      signal: AbortSignal.timeout(15_000),
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9,zh-CN;q=0.8,zh;q=0.7,ja;q=0.6",
      },
    });

    if (!res.ok) {
      return {
        url,
        title: "",
        content: `[HTTP ${res.status}]`,
        success: false,
        statusCode: res.status,
      };
    }

    const contentType = res.headers.get("content-type") || "";
    if (
      !contentType.includes("text/html") &&
      !contentType.includes("text/plain") &&
      !contentType.includes("application/xhtml")
    ) {
      return {
        url,
        title: "",
        content: `[Non-HTML content: ${contentType}]`,
        success: false,
        statusCode: res.status,
      };
    }

    const html = await res.text();
    const title = extractTitle(html);
    const content = extractText(html);

    return { url, title, content, success: true, statusCode: res.status };
  } catch (e) {
    return {
      url,
      title: "",
      content: `[Error: ${e instanceof Error ? e.message : String(e)}]`,
      success: false,
    };
  }
}
