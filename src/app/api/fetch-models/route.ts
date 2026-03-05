import { NextRequest, NextResponse } from "next/server";
import { getSettings } from "@/lib/settings";
import { safeJson } from "@/lib/api-utils";

export async function POST(req: NextRequest) {
  const { providerId, apiKey: directKey, baseUrl: directBaseUrl, sdkType: directSdkType } = await req.json();

  let apiKey: string, baseUrl: string, sdkType: string;

  if (directKey && directBaseUrl && directSdkType) {
    apiKey = directKey;
    baseUrl = directBaseUrl;
    sdkType = directSdkType;
  } else {
    const settings = getSettings();
    const provider = settings.providers.find((p) => p.id === providerId);
    if (!provider) return NextResponse.json({ error: "Provider not found" }, { status: 404 });
    if (!provider.apiKey || provider.apiKey.startsWith("***")) {
      return NextResponse.json({ error: "请先填写 API Key 并保存" }, { status: 400 });
    }
    apiKey = provider.apiKey;
    baseUrl = provider.baseUrl;
    sdkType = provider.sdkType;
  }

  try {
    if (sdkType === "gemini") {
      return NextResponse.json(await fetchGeminiModels(baseUrl, apiKey));
    }
    if (sdkType === "anthropic") {
      return NextResponse.json(getAnthropicModels());
    }
    return NextResponse.json(await fetchOpenAIModels(baseUrl, apiKey));
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}

interface FetchedModel {
  id: string;
  name: string;
  owned_by?: string;
}

function joinUrl(base: string, path: string): string {
  return base.replace(/\/+$/, "") + "/" + path.replace(/^\/+/, "");
}

async function fetchGeminiModels(baseUrl: string, apiKey: string): Promise<{ models: FetchedModel[] }> {
  const modelsPath = "models";

  // Strategy 1: ?key= (official Google API)
  // Strategy 2: Authorization: Bearer (proxies / relay services)
  // Strategy 3: OpenAI-compatible /v1/models (some proxies expose Gemini as OpenAI format)
  const attempts = [
    { url: joinUrl(baseUrl, modelsPath) + `?key=${apiKey}`, headers: {} as Record<string, string> },
    { url: joinUrl(baseUrl, modelsPath), headers: { Authorization: `Bearer ${apiKey}` } },
    { url: joinUrl(baseUrl, "v1/models"), headers: { Authorization: `Bearer ${apiKey}` } },
  ];

  let lastError = "";
  for (const attempt of attempts) {
    try {
      const res = await fetch(attempt.url, {
        headers: { ...attempt.headers },
        signal: AbortSignal.timeout(15000),
      });
      if (!res.ok) {
        lastError = `${attempt.url} → ${res.status}`;
        continue;
      }
      const data = await res.json();

      // Gemini native format: { models: [...] }
      if (data.models && Array.isArray(data.models)) {
        const models: FetchedModel[] = data.models
          .filter((m: { name?: string; supportedGenerationMethods?: string[] }) => {
            const name = m.name ?? "";
            const methods = m.supportedGenerationMethods ?? [];
            if (methods.length > 0 && !methods.includes("generateContent")) return false;
            return (
              name.includes("gemini") &&
              !name.includes("tts") &&
              !name.includes("embedding") &&
              !name.includes("image-generation") &&
              !name.includes("audio") &&
              !name.includes("robotics") &&
              !name.includes("computer-use")
            );
          })
          .map((m: { name: string; displayName?: string }) => ({
            id: m.name.replace("models/", ""),
            name: m.displayName ?? m.name.replace("models/", ""),
          }));
        if (models.length > 0) return { models };
      }

      // OpenAI format: { data: [{ id, ... }] }
      const list = data.data ?? [];
      if (Array.isArray(list) && list.length > 0) {
        const models: FetchedModel[] = list
          .filter((m: { id: string }) => m.id?.includes("gemini"))
          .map((m: { id: string; owned_by?: string }) => ({
            id: m.id,
            name: m.id,
            owned_by: m.owned_by,
          }));
        if (models.length > 0) return { models };
        // no gemini filter? return all
        return {
          models: list.map((m: { id: string; owned_by?: string }) => ({
            id: m.id,
            name: m.id,
            owned_by: m.owned_by,
          })),
        };
      }

      lastError = `${attempt.url} → 返回数据格式无法识别`;
    } catch (err) {
      lastError = `${attempt.url} → ${err instanceof Error ? err.message : err}`;
    }
  }

  throw new Error(`获取模型失败（尝试了 ${attempts.length} 种方式）：${lastError}`);
}

async function fetchOpenAIModels(baseUrl: string, apiKey: string): Promise<{ models: FetchedModel[] }> {
  const attempts = [
    joinUrl(baseUrl, "models"),
    joinUrl(baseUrl, "v1/models"),
  ];

  for (const url of attempts) {
    try {
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${apiKey}` },
        signal: AbortSignal.timeout(15000),
      });
      if (!res.ok) continue;
      const data = await safeJson(res, "OpenAI Models");
      const list = data.data ?? data.models ?? [];
      if (!Array.isArray(list) || list.length === 0) continue;

      return {
        models: list.map((m: { id: string; owned_by?: string }) => ({
          id: m.id,
          name: m.id,
          owned_by: m.owned_by,
        })),
      };
    } catch {
      continue;
    }
  }
  throw new Error("无法获取模型列表，请检查 Base URL 和 API Key");
}

function getAnthropicModels(): { models: FetchedModel[] } {
  return {
    models: [
      { id: "claude-sonnet-4-20250514", name: "Claude Sonnet 4" },
      { id: "claude-opus-4-20250514", name: "Claude Opus 4" },
      { id: "claude-haiku-3-20250422", name: "Claude Haiku 3" },
    ],
  };
}
