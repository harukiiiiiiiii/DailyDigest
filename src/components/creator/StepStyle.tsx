"use client";

import { LayoutTemplate, List, LayoutGrid, BarChart3 } from "lucide-react";
import type { ChannelCreatorState, TemplateType, ColorScheme } from "@/lib/types";
import { colorSchemes, type ColorSchemeConfig } from "@/lib/colors";

interface Props {
  state: ChannelCreatorState;
  update: (patch: Partial<ChannelCreatorState>) => void;
}

const templates: {
  id: TemplateType;
  name: string;
  desc: string;
  icon: React.ElementType;
}[] = [
  {
    id: "magazine",
    name: "杂志双栏",
    desc: "图文并茂，适合深度阅读",
    icon: LayoutTemplate,
  },
  {
    id: "feed",
    name: "信息流",
    desc: "高密度列表，适合快讯",
    icon: List,
  },
  {
    id: "cards",
    name: "卡片瀑布",
    desc: "视觉优先，适合图片内容",
    icon: LayoutGrid,
  },
  {
    id: "dashboard",
    name: "数据看板",
    desc: "指标优先，适合财经数据",
    icon: BarChart3,
  },
];

function ColorSwatch({ scheme, active, onClick }: {
  scheme: ColorSchemeConfig;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`relative p-3 rounded-xl border-2 transition-all duration-200 text-left
        ${active ? "border-channel-primary shadow-md scale-[1.02]" : "border-border hover:border-gray-300"}`}
    >
      <div
        className="h-8 rounded-lg mb-2"
        style={{
          background: `linear-gradient(135deg, ${scheme.primary}, ${scheme.accent})`,
        }}
      />
      <div className="text-sm font-medium">{scheme.name}</div>
      <div className="text-xs text-text-muted">{scheme.nameEn}</div>
      {active && (
        <div className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-channel-primary text-white text-xs flex items-center justify-center">
          ✓
        </div>
      )}
    </button>
  );
}

export default function StepStyle({ state, update }: Props) {
  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl font-bold mb-1">选择展示风格</h2>
        <p className="text-sm text-text-secondary">
          不同的布局和配色适合不同类型的内容
        </p>
      </div>

      <div>
        <h3 className="text-sm font-medium mb-3">布局方式</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {templates.map((t) => {
            const Icon = t.icon;
            const active = state.template === t.id;
            return (
              <button
                key={t.id}
                onClick={() => update({ template: t.id })}
                className={`p-4 rounded-xl border-2 text-left transition-all duration-200
                  ${active ? "border-channel-primary bg-channel-bg shadow-sm" : "border-border hover:border-gray-300"}`}
              >
                <Icon
                  className={`w-8 h-8 mb-2 ${active ? "text-channel-primary" : "text-text-muted"}`}
                />
                <div className="text-sm font-medium">{t.name}</div>
                <div className="text-xs text-text-muted mt-0.5">{t.desc}</div>
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <h3 className="text-sm font-medium mb-3">配色方案</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {Object.values(colorSchemes).map((scheme) => (
            <ColorSwatch
              key={scheme.id}
              scheme={scheme}
              active={state.colorScheme === scheme.id}
              onClick={() => update({ colorScheme: scheme.id })}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
