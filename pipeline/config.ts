import fs from "fs";
import path from "path";
import { SearchAgentId, IntegrationModelId } from "./types";

export interface AgentApiConfig {
  apiKey: string;
  baseUrl: string;
  model: string;
  sdkType: string;
  maxTokens: number;
  inputPricePer1M: number;
  outputPricePer1M: number;
  timeoutMs: number;
}

interface SettingsProvider {
  id: string;
  name: string;
  sdkType: string;
  baseUrl: string;
  apiKey: string;
  enabled: boolean;
  models: Array<{
    id: string;
    name: string;
    maxTokens: number;
    inputPricePer1M: number;
    outputPricePer1M: number;
  }>;
}

interface SettingsFile {
  providers: SettingsProvider[];
  defaults: {
    searchAgents: Record<string, { providerId: string; modelId: string }>;
    integrationModel: { providerId: string; modelId: string };
  };
}

function loadSettings(): SettingsFile {
  const settingsPath = path.join(process.cwd(), "data", "settings.json");
  if (fs.existsSync(settingsPath)) {
    return JSON.parse(fs.readFileSync(settingsPath, "utf-8"));
  }
  return { providers: [], defaults: { searchAgents: {}, integrationModel: { providerId: "", modelId: "" } } };
}

function env(key: string, fallback = ""): string {
  return process.env[key] ?? fallback;
}

function resolveFromSettings(
  providerId: string,
  modelId: string,
  settings: SettingsFile,
): AgentApiConfig | null {
  const provider = settings.providers.find((p) => p.id === providerId && p.enabled);
  if (!provider) return null;

  const apiKey = provider.apiKey || env(`${providerId.toUpperCase()}_API_KEY`) || env(`${provider.name.split(" ")[0].toUpperCase()}_API_KEY`);
  if (!apiKey) return null;

  const model = provider.models.find((m) => m.id === modelId);
  if (!model) return null;

  return {
    apiKey,
    baseUrl: provider.baseUrl,
    model: model.id,
    sdkType: provider.sdkType,
    maxTokens: model.maxTokens,
    inputPricePer1M: model.inputPricePer1M,
    outputPricePer1M: model.outputPricePer1M,
    timeoutMs: provider.sdkType === "gemini" ? 90_000 : 60_000,
  };
}

// ─── Hardcoded fallbacks (used when settings.json has no config) ──
const FALLBACK_SEARCH: Record<SearchAgentId, AgentApiConfig> = {
  grok: {
    apiKey: env("XAI_API_KEY"), baseUrl: "https://api.x.ai/v1",
    model: env("GROK_MODEL", "grok-3-mini"), sdkType: "openai",
    maxTokens: 4096, inputPricePer1M: 0.30, outputPricePer1M: 0.50, timeoutMs: 60_000,
  },
  gemini: {
    apiKey: env("GEMINI_API_KEY"), baseUrl: "https://generativelanguage.googleapis.com/v1beta",
    model: env("GEMINI_MODEL", "gemini-2.5-flash"), sdkType: "gemini",
    maxTokens: 16384, inputPricePer1M: 0.15, outputPricePer1M: 0.60, timeoutMs: 90_000,
  },
  doubao: {
    apiKey: env("DOUBAO_API_KEY"), baseUrl: env("DOUBAO_BASE_URL", "https://ark.cn-beijing.volces.com/api/v3"),
    model: env("DOUBAO_MODEL", "doubao-1.5-pro-256k"), sdkType: "openai",
    maxTokens: 4096, inputPricePer1M: 0.80, outputPricePer1M: 2.00, timeoutMs: 60_000,
  },
  perplexity: {
    apiKey: env("PERPLEXITY_API_KEY"), baseUrl: "https://api.perplexity.ai",
    model: env("PERPLEXITY_MODEL", "sonar-pro"), sdkType: "perplexity",
    maxTokens: 4096, inputPricePer1M: 3.00, outputPricePer1M: 15.00, timeoutMs: 60_000,
  },
};

// ─── Public API ──────────────────────────────────────────────

export function getSearchAgentConfig(
  agent: SearchAgentId,
  modelOverride?: string,
  channelBinding?: { providerId: string; modelId: string },
): AgentApiConfig {
  const settings = loadSettings();
  const assignment = channelBinding ?? settings.defaults.searchAgents[agent];

  if (assignment?.providerId && assignment?.modelId) {
    const resolved = resolveFromSettings(assignment.providerId, assignment.modelId, settings);
    if (resolved) {
      if (modelOverride) resolved.model = modelOverride;
      return resolved;
    }
  }

  const fallback = { ...FALLBACK_SEARCH[agent] };
  if (modelOverride) fallback.model = modelOverride;
  return fallback;
}

export function getIntegrationConfig(
  model: IntegrationModelId,
  modelOverride?: string,
  channelBinding?: { providerId: string; modelId: string },
): AgentApiConfig {
  const settings = loadSettings();
  const assignment = channelBinding ?? settings.defaults.integrationModel;

  if (assignment?.providerId && assignment?.modelId) {
    const resolved = resolveFromSettings(assignment.providerId, assignment.modelId, settings);
    if (resolved) {
      resolved.maxTokens = 32768;
      resolved.timeoutMs = 180_000;
      if (modelOverride) resolved.model = modelOverride;
      return resolved;
    }
  }

  // fallback to hardcoded by model ID
  const fallbacks: Record<string, AgentApiConfig> = {
    gemini: {
      apiKey: env("GEMINI_API_KEY"), baseUrl: "https://generativelanguage.googleapis.com/v1beta",
      model: env("GEMINI_MODEL", "gemini-2.5-flash"), sdkType: "gemini",
      maxTokens: 32768, inputPricePer1M: 0.15, outputPricePer1M: 0.60, timeoutMs: 180_000,
    },
    "claude-opus": {
      apiKey: env("ANTHROPIC_API_KEY"), baseUrl: "https://api.anthropic.com/v1",
      model: "claude-opus-4-20250514", sdkType: "anthropic",
      maxTokens: 8192, inputPricePer1M: 15.00, outputPricePer1M: 75.00, timeoutMs: 120_000,
    },
    "claude-sonnet": {
      apiKey: env("ANTHROPIC_API_KEY"), baseUrl: "https://api.anthropic.com/v1",
      model: "claude-sonnet-4-20250514", sdkType: "anthropic",
      maxTokens: 8192, inputPricePer1M: 3.00, outputPricePer1M: 15.00, timeoutMs: 90_000,
    },
    "deepseek-r1": {
      apiKey: env("DEEPSEEK_API_KEY"), baseUrl: "https://api.deepseek.com",
      model: "deepseek-reasoner", sdkType: "openai",
      maxTokens: 8192, inputPricePer1M: 0.55, outputPricePer1M: 2.19, timeoutMs: 120_000,
    },
    "deepseek-chat": {
      apiKey: env("DEEPSEEK_API_KEY"), baseUrl: "https://api.deepseek.com",
      model: "deepseek-chat", sdkType: "openai",
      maxTokens: 8192, inputPricePer1M: 0.27, outputPricePer1M: 1.10, timeoutMs: 90_000,
    },
  };

  const cfg = { ...(fallbacks[model] ?? fallbacks.gemini) };
  if (modelOverride) cfg.model = modelOverride;
  return cfg;
}

export function calcCost(
  usage: { inputTokens: number; outputTokens: number },
  cfg: AgentApiConfig,
): number {
  return (
    (usage.inputTokens / 1_000_000) * cfg.inputPricePer1M +
    (usage.outputTokens / 1_000_000) * cfg.outputPricePer1M
  );
}
