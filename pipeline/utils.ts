/**
 * Safely parse a fetch Response as JSON.
 * Throws a clear error if the response is HTML or other non-JSON content.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function safeJson(res: Response, label = "API"): Promise<any> {
  const ct = res.headers.get("content-type") ?? "";
  const text = await res.text();

  if (!ct.includes("json") && text.trimStart().startsWith("<")) {
    throw new Error(`${label} returned HTML instead of JSON (status ${res.status}). Check your API Base URL.`);
  }

  if (!res.ok) {
    let msg: string;
    try {
      const parsed = JSON.parse(text);
      msg = parsed.error?.message ?? parsed.message ?? text.slice(0, 200);
    } catch {
      msg = text.slice(0, 200);
    }
    throw new Error(`${label} ${res.status}: ${msg}`);
  }

  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`${label} returned invalid JSON: ${text.slice(0, 100)}`);
  }
}

export function joinUrl(base: string, path: string): string {
  return base.replace(/\/+$/, "") + "/" + path.replace(/^\/+/, "");
}

/**
 * Build OpenAI-compatible chat completions URL.
 * Handles cases where baseUrl may already contain /v1, /v1beta, etc.
 */
export function openaiUrl(baseUrl: string): string {
  const clean = baseUrl.replace(/\/+$/, "");
  // If baseUrl already ends with /v1 or /v1beta or similar version path, append directly
  if (/\/v\d/.test(clean)) {
    return clean + "/chat/completions";
  }
  return clean + "/v1/chat/completions";
}
