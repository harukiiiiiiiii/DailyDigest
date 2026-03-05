"use client";

import { useState, useEffect } from "react";
import {
  Save,
  Loader2,
  Check,
  ChevronDown,
  ChevronUp,
  Plus,
  Trash2,
  Eye,
  EyeOff,
  RefreshCw,
  Play,
  CircleCheck,
  CircleX,
  Clock,
  Download,
} from "lucide-react";
import type { AiProvider, AiModel, GlobalSettings, ModelAssignment } from "@/lib/types";

const SDK_OPTIONS: { value: string; label: string }[] = [
  { value: "openai", label: "OpenAI Compatible" },
  { value: "anthropic", label: "Anthropic" },
  { value: "gemini", label: "Google Gemini" },
  { value: "perplexity", label: "Perplexity" },
];

const AGENT_LABELS: Record<string, string> = {
  gemini: "Gemini (Google 搜索)",
  grok: "Grok (X/Twitter)",
  perplexity: "Perplexity (精确引用)",
  doubao: "豆包 (中文互联网)",
};

type ModelTestStatus = { state: "idle" } | { state: "testing" } | { state: "ok"; latencyMs: number; response: string } | { state: "fail"; error: string };

export default function ProvidersTab() {
  const [settings, setSettings] = useState<GlobalSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [showKeys, setShowKeys] = useState<Record<string, boolean>>({});
  const [fetchingModels, setFetchingModels] = useState<Record<string, boolean>>({});
  const [modelTests, setModelTests] = useState<Record<string, ModelTestStatus>>({});

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then((data) => { setSettings(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    if (!settings) return;
    setSaving(true);
    setSaved(false);
    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
      if (res.ok) { setSaved(true); setTimeout(() => setSaved(false), 2000); }
    } finally {
      setSaving(false);
    }
  };

  const updateProvider = (id: string, patch: Partial<AiProvider>) => {
    if (!settings) return;
    setSettings({
      ...settings,
      providers: settings.providers.map((p) =>
        p.id === id ? { ...p, ...patch } : p
      ),
    });
  };

  const updateModel = (providerId: string, modelIdx: number, patch: Partial<AiModel>) => {
    if (!settings) return;
    setSettings({
      ...settings,
      providers: settings.providers.map((p) => {
        if (p.id !== providerId) return p;
        const models = [...p.models];
        models[modelIdx] = { ...models[modelIdx], ...patch };
        return { ...p, models };
      }),
    });
  };

  const addModel = (providerId: string) => {
    if (!settings) return;
    setSettings({
      ...settings,
      providers: settings.providers.map((p) => {
        if (p.id !== providerId) return p;
        return {
          ...p,
          models: [...p.models, { id: "", name: "", maxTokens: 4096, inputPricePer1M: 0, outputPricePer1M: 0 }],
        };
      }),
    });
  };

  const removeModel = (providerId: string, modelIdx: number) => {
    if (!settings) return;
    setSettings({
      ...settings,
      providers: settings.providers.map((p) => {
        if (p.id !== providerId) return p;
        return { ...p, models: p.models.filter((_, i) => i !== modelIdx) };
      }),
    });
  };

  const addProvider = () => {
    if (!settings) return;
    const id = `custom-${Date.now()}`;
    setSettings({
      ...settings,
      providers: [
        ...settings.providers,
        { id, name: "新渠道", sdkType: "openai", baseUrl: "", apiKey: "", enabled: false, models: [] },
      ],
    });
    setExpanded(id);
  };

  const removeProvider = (id: string) => {
    if (!settings) return;
    setSettings({
      ...settings,
      providers: settings.providers.filter((p) => p.id !== id),
    });
  };

  const updateDefault = (key: string, assignment: ModelAssignment) => {
    if (!settings) return;
    if (key === "_integration") {
      setSettings({ ...settings, defaults: { ...settings.defaults, integrationModel: assignment } });
    } else {
      setSettings({
        ...settings,
        defaults: {
          ...settings.defaults,
          searchAgents: { ...settings.defaults.searchAgents, [key]: assignment },
        },
      });
    }
  };

  // ─── Fetch models from API ───────────────────────────────────
  const handleFetchModels = async (providerId: string) => {
    const prov = settings?.providers.find((p) => p.id === providerId);
    if (!prov) return;

    const realKey = prov.apiKey.startsWith("***") ? undefined : prov.apiKey;
    if (!realKey) {
      alert("请先输入 API Key（当前显示的是脱敏值）");
      return;
    }

    setFetchingModels((s) => ({ ...s, [providerId]: true }));
    try {
      const res = await fetch("/api/fetch-models", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          providerId,
          apiKey: realKey,
          baseUrl: prov.baseUrl,
          sdkType: prov.sdkType,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(`获取模型失败：${data.error}`);
        return;
      }
      const fetched: Array<{ id: string; name: string }> = data.models ?? [];
      if (fetched.length === 0) {
        alert("未获取到任何模型");
        return;
      }

      if (!settings) return;
      const provider = settings.providers.find((p) => p.id === providerId);
      if (!provider) return;

      // merge: keep existing models (preserve prices), add new ones
      const existingIds = new Set(provider.models.map((m) => m.id));
      const newModels: AiModel[] = fetched
        .filter((m) => !existingIds.has(m.id))
        .map((m) => ({ id: m.id, name: m.name, maxTokens: 4096, inputPricePer1M: 0, outputPricePer1M: 0 }));

      if (newModels.length === 0) {
        alert(`已是最新，共 ${fetched.length} 个模型`);
        return;
      }

      updateProvider(providerId, { models: [...provider.models, ...newModels] });
      alert(`新增 ${newModels.length} 个模型（共 ${provider.models.length + newModels.length} 个）`);
    } catch (err) {
      alert(`获取失败：${err instanceof Error ? err.message : err}`);
    } finally {
      setFetchingModels((s) => ({ ...s, [providerId]: false }));
    }
  };

  // ─── Test individual model ───────────────────────────────────
  const handleTestModel = async (providerId: string, modelId: string) => {
    const testKey = `${providerId}:${modelId}`;
    setModelTests((s) => ({ ...s, [testKey]: { state: "testing" } }));

    const prov = settings?.providers.find((p) => p.id === providerId);
    if (!prov) return;

    const realKey = prov.apiKey.startsWith("***") ? undefined : prov.apiKey;

    try {
      const res = await fetch("/api/test-provider", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          providerId,
          modelId,
          ...(realKey ? { apiKey: realKey, baseUrl: prov.baseUrl, sdkType: prov.sdkType } : {}),
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setModelTests((s) => ({
          ...s,
          [testKey]: { state: "ok", latencyMs: data.latencyMs, response: data.response },
        }));
      } else {
        setModelTests((s) => ({
          ...s,
          [testKey]: { state: "fail", error: data.error ?? "Unknown error" },
        }));
      }
    } catch (err) {
      setModelTests((s) => ({
        ...s,
        [testKey]: { state: "fail", error: err instanceof Error ? err.message : "Network error" },
      }));
    }
  };

  // ─── Test ALL models of a provider ───────────────────────────
  const handleTestAll = async (provider: AiProvider) => {
    for (const model of provider.models) {
      if (!model.id) continue;
      await handleTestModel(provider.id, model.id);
    }
  };

  if (loading) return <div className="py-12 text-center text-text-muted">加载中…</div>;
  if (!settings) return <div className="py-12 text-center text-red-500">加载设置失败</div>;

  const enabledProviders = settings.providers.filter((p) => p.enabled && p.models.length > 0);

  return (
    <div className="space-y-8">
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">AI 渠道</h2>
          <button
            onClick={addProvider}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-border hover:bg-gray-50 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            添加自定义渠道
          </button>
        </div>

        <div className="space-y-3">
          {settings.providers.map((provider) => {
            const isOpen = expanded === provider.id;
            const isFetching = fetchingModels[provider.id];
            const testedCount = provider.models.filter((m) => {
              const t = modelTests[`${provider.id}:${m.id}`];
              return t?.state === "ok";
            }).length;
            const failedCount = provider.models.filter((m) => {
              const t = modelTests[`${provider.id}:${m.id}`];
              return t?.state === "fail";
            }).length;

            return (
              <div key={provider.id} className="bg-white rounded-xl border border-border overflow-hidden">
                {/* header */}
                <button
                  onClick={() => setExpanded(isOpen ? null : provider.id)}
                  className="w-full flex items-center gap-3 px-5 py-4 text-left hover:bg-gray-50/50 transition-colors"
                >
                  <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${provider.enabled && provider.apiKey ? "bg-emerald-400" : "bg-gray-300"}`} />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm">{provider.name}</div>
                    <div className="text-xs text-text-muted">
                      {provider.sdkType.toUpperCase()} · {provider.models.length} 个模型
                      {provider.apiKey ? " · 已配置密钥" : ""}
                      {testedCount > 0 && <span className="text-emerald-500 ml-1">· {testedCount} 可用</span>}
                      {failedCount > 0 && <span className="text-red-500 ml-1">· {failedCount} 不可用</span>}
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={provider.enabled}
                      onChange={(e) => updateProvider(provider.id, { enabled: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-gray-200 rounded-full peer peer-checked:bg-channel-primary transition-colors after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:after:translate-x-full" />
                  </label>
                  {isOpen ? <ChevronUp className="w-4 h-4 text-text-muted" /> : <ChevronDown className="w-4 h-4 text-text-muted" />}
                </button>

                {isOpen && (
                  <div className="px-5 pb-5 border-t border-border-light space-y-4 pt-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-medium text-text-secondary mb-1">渠道名称</label>
                        <input value={provider.name} onChange={(e) => updateProvider(provider.id, { name: e.target.value })}
                          className="w-full px-3 py-2 text-sm rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-channel-primary/30" />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-text-secondary mb-1">SDK 类型</label>
                        <select value={provider.sdkType} onChange={(e) => updateProvider(provider.id, { sdkType: e.target.value as AiProvider["sdkType"] })}
                          className="w-full px-3 py-2 text-sm rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-channel-primary/30">
                          {SDK_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-text-secondary mb-1">API Base URL</label>
                      <input value={provider.baseUrl} onChange={(e) => updateProvider(provider.id, { baseUrl: e.target.value })}
                        placeholder="https://api.example.com/v1"
                        className="w-full px-3 py-2 text-sm rounded-lg border border-border font-mono focus:outline-none focus:ring-2 focus:ring-channel-primary/30" />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-text-secondary mb-1">API Key</label>
                      <div className="flex gap-2">
                        <input
                          type={showKeys[provider.id] ? "text" : "password"}
                          value={provider.apiKey}
                          onChange={(e) => updateProvider(provider.id, { apiKey: e.target.value })}
                          placeholder="sk-..."
                          className="flex-1 px-3 py-2 text-sm rounded-lg border border-border font-mono focus:outline-none focus:ring-2 focus:ring-channel-primary/30"
                        />
                        <button onClick={() => setShowKeys((k) => ({ ...k, [provider.id]: !k[provider.id] }))}
                          className="px-3 py-2 rounded-lg border border-border hover:bg-gray-50 transition-colors" title="显示/隐藏">
                          {showKeys[provider.id] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    {/* models section */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className="text-xs font-medium text-text-secondary">
                          模型列表 ({provider.models.length})
                        </label>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleFetchModels(provider.id)}
                            disabled={isFetching}
                            className="inline-flex items-center gap-1 text-xs text-channel-primary hover:underline disabled:opacity-50"
                          >
                            {isFetching
                              ? <><Loader2 className="w-3 h-3 animate-spin" />获取中…</>
                              : <><Download className="w-3 h-3" />自动获取模型</>
                            }
                          </button>
                          <button
                            onClick={() => handleTestAll(provider)}
                            className="inline-flex items-center gap-1 text-xs text-channel-primary hover:underline"
                          >
                            <Play className="w-3 h-3" />全部测试
                          </button>
                          <button onClick={() => addModel(provider.id)}
                            className="text-xs text-channel-primary hover:underline">
                            <Plus className="w-3 h-3 inline" /> 手动添加
                          </button>
                        </div>
                      </div>

                      <div className="space-y-2">
                        {provider.models.map((model, mi) => {
                          const testKey = `${provider.id}:${model.id}`;
                          const testStatus = modelTests[testKey] ?? { state: "idle" as const };

                          return (
                            <div key={mi} className={`flex items-center gap-2 p-2.5 rounded-lg border transition-colors ${
                              testStatus.state === "ok" ? "bg-emerald-50/50 border-emerald-200" :
                              testStatus.state === "fail" ? "bg-red-50/50 border-red-200" :
                              "bg-gray-50 border-transparent"
                            }`}>
                              {/* status indicator */}
                              <div className="w-5 flex-shrink-0 flex justify-center">
                                {testStatus.state === "ok" && <CircleCheck className="w-4 h-4 text-emerald-500" />}
                                {testStatus.state === "fail" && <CircleX className="w-4 h-4 text-red-500" />}
                                {testStatus.state === "testing" && <Loader2 className="w-4 h-4 animate-spin text-channel-primary" />}
                                {testStatus.state === "idle" && <div className="w-2 h-2 rounded-full bg-gray-300" />}
                              </div>

                              {/* model id */}
                              <input value={model.id} onChange={(e) => updateModel(provider.id, mi, { id: e.target.value })}
                                placeholder="model-id"
                                className="flex-1 px-2 py-1 text-xs rounded border border-border font-mono bg-white min-w-0" />

                              {/* display name */}
                              <input value={model.name} onChange={(e) => updateModel(provider.id, mi, { name: e.target.value })}
                                placeholder="显示名"
                                className="w-24 px-2 py-1 text-xs rounded border border-border bg-white hidden sm:block" />

                              {/* prices */}
                              <div className="flex items-center gap-1 text-xs text-text-muted">
                                <span>$</span>
                                <input type="number" step="0.01" value={model.inputPricePer1M}
                                  onChange={(e) => updateModel(provider.id, mi, { inputPricePer1M: +e.target.value })}
                                  className="w-12 px-1 py-1 text-xs rounded border border-border bg-white text-center" />
                                <span>/</span>
                                <input type="number" step="0.01" value={model.outputPricePer1M}
                                  onChange={(e) => updateModel(provider.id, mi, { outputPricePer1M: +e.target.value })}
                                  className="w-12 px-1 py-1 text-xs rounded border border-border bg-white text-center" />
                              </div>

                              {/* test button */}
                              <button
                                onClick={() => model.id && handleTestModel(provider.id, model.id)}
                                disabled={!model.id || testStatus.state === "testing"}
                                className="px-2 py-1 rounded border border-border text-xs hover:bg-white disabled:opacity-40 transition-colors flex-shrink-0"
                                title="测试此模型"
                              >
                                {testStatus.state === "testing" ? <Loader2 className="w-3 h-3 animate-spin" /> : <Play className="w-3 h-3" />}
                              </button>

                              {/* delete */}
                              <button onClick={() => removeModel(provider.id, mi)}
                                className="text-text-muted hover:text-red-500 transition-colors flex-shrink-0">
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>

                              {/* latency / error tooltip */}
                              {testStatus.state === "ok" && (
                                <span className="text-xs text-emerald-600 flex-shrink-0 hidden sm:flex items-center gap-0.5">
                                  <Clock className="w-3 h-3" />{testStatus.latencyMs}ms
                                </span>
                              )}
                              {testStatus.state === "fail" && (
                                <span className="text-xs text-red-500 flex-shrink-0 max-w-32 truncate hidden sm:block" title={testStatus.error}>
                                  {testStatus.error}
                                </span>
                              )}
                            </div>
                          );
                        })}

                        {provider.models.length === 0 && (
                          <div className="text-center py-4 text-xs text-text-muted">
                            暂无模型 — 点击「自动获取模型」从 API 拉取，或手动添加
                          </div>
                        )}
                      </div>
                    </div>

                    {provider.id.startsWith("custom-") && (
                      <button onClick={() => removeProvider(provider.id)}
                        className="text-xs text-red-500 hover:underline">
                        删除此渠道
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* default assignments */}
      <section>
        <h2 className="text-lg font-semibold mb-4">默认模型分配</h2>
        <p className="text-xs text-text-secondary mb-4">
          为每个搜索 Agent 和整合层指定默认使用的渠道和模型。频道可以单独覆盖。
        </p>
        <div className="space-y-3">
          {Object.entries(AGENT_LABELS).map(([agentKey, label]) => (
            <ModelAssignmentRow key={agentKey} label={`搜索: ${label}`}
              providers={enabledProviders} value={settings.defaults.searchAgents[agentKey]}
              onChange={(a) => updateDefault(agentKey, a)} />
          ))}
          <ModelAssignmentRow label="整合层模型"
            providers={enabledProviders} value={settings.defaults.integrationModel}
            onChange={(a) => updateDefault("_integration", a)} />
        </div>
      </section>

      {/* save */}
      <div className="flex justify-end pt-4 border-t border-border">
        <button onClick={handleSave} disabled={saving}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium bg-channel-primary text-white hover:opacity-90 disabled:opacity-70 transition-opacity">
          {saved ? <><Check className="w-4 h-4" />已保存</> : saving ? <><Loader2 className="w-4 h-4 animate-spin" />保存中…</> : <><Save className="w-4 h-4" />保存设置</>}
        </button>
      </div>
    </div>
  );
}

function ModelAssignmentRow({ label, providers, value, onChange }: {
  label: string;
  providers: AiProvider[];
  value?: ModelAssignment;
  onChange: (a: ModelAssignment) => void;
}) {
  const currentProvider = providers.find((p) => p.id === value?.providerId);
  const allModels = currentProvider?.models ?? [];

  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 p-3 bg-white rounded-lg border border-border">
      <span className="text-sm font-medium sm:w-44 flex-shrink-0">{label}</span>
      <select value={value?.providerId ?? ""}
        onChange={(e) => {
          const prov = providers.find((p) => p.id === e.target.value);
          onChange({ providerId: e.target.value, modelId: prov?.models[0]?.id ?? "" });
        }}
        className="flex-1 px-2 py-1.5 text-sm rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-channel-primary/30">
        <option value="">未配置</option>
        {providers.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
      </select>
      <select value={value?.modelId ?? ""}
        onChange={(e) => onChange({ providerId: value?.providerId ?? "", modelId: e.target.value })}
        className="flex-1 px-2 py-1.5 text-sm rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-channel-primary/30">
        <option value="">选择模型</option>
        {allModels.map((m) => <option key={m.id} value={m.id}>{m.name || m.id}</option>)}
      </select>
    </div>
  );
}
