export interface Article {
  title: string;
  summary: string;
  source: string;
  sourceAgents: string[];
  verified: boolean;
  importance: number;
  tags: string[];
  image: string;
  url: string;
  context: string;
}

export interface DailyDigest {
  date: string;
  weekday: string;
  channel: string;
  topic: string;
  digest: string;
  articles: Article[];
  meta: {
    agents_used: string[];
    total_raw: number;
    after_dedup: number;
    final_selected: number;
    generated_at: string;
    cost_usd: number;
  };
}

export type TemplateType = "magazine" | "feed" | "cards" | "dashboard";
export type ColorScheme = "ocean" | "sunset" | "forest" | "lavender" | "ember" | "arctic" | "midnight" | "sakura";

export interface ChannelConfig {
  id: string;
  name: string;
  nameEn: string;
  description: string;
  icon: string;
  template: TemplateType;
  colorScheme: ColorScheme;
  keywords: string[];
  sources: string[];
  searchPrompt: string;
  agentCombo: string[];
  integrationModel: string;
  createdAt: string;
  /** Per-agent model bindings — override global defaults for this channel */
  modelBindings?: Record<string, ModelAssignment>;
  /** Integration model binding — override global default for this channel */
  integrationBinding?: ModelAssignment;
}

export interface SourceFeasibility {
  source: string;
  status: "easy" | "partial" | "hard" | "impossible";
  note: string;
  alternative?: string;
}

// ─── Settings: AI Provider & Model Configuration ─────────────
export type SdkType = "openai" | "anthropic" | "gemini" | "perplexity";

export interface AiProvider {
  id: string;
  name: string;
  sdkType: SdkType;
  baseUrl: string;
  apiKey: string;
  models: AiModel[];
  enabled: boolean;
}

export interface AiModel {
  id: string;
  name: string;
  maxTokens: number;
  inputPricePer1M: number;
  outputPricePer1M: number;
}

export interface ModelAssignment {
  providerId: string;
  modelId: string;
}

export interface GlobalSettings {
  providers: AiProvider[];
  defaults: {
    searchAgents: Record<string, ModelAssignment>;
    integrationModel: ModelAssignment;
  };
}

export interface ChannelCreatorState {
  step: number;
  name: string;
  nameEn: string;
  description: string;
  keywords: string[];
  sources: string[];
  focusNotes: string;
  template: TemplateType;
  colorScheme: ColorScheme;
}
