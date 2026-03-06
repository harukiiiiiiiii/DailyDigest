"use client";

import { useState } from "react";
import { Settings, Layers, DollarSign, UserCog } from "lucide-react";
import ProvidersTab from "./ProvidersTab";
import ChannelsTab from "./ChannelsTab";
import CostsTab from "./CostsTab";
import AccountTab from "./AccountTab";

const TABS = [
  { id: "providers", label: "AI 渠道", icon: Settings },
  { id: "channels", label: "频道管理", icon: Layers },
  { id: "costs", label: "成本统计", icon: DollarSign },
  { id: "account", label: "帐号设置", icon: UserCog },
] as const;

type TabId = (typeof TABS)[number]["id"];

export default function SettingsClient() {
  const [tab, setTab] = useState<TabId>("providers");

  return (
    <div>
      <div className="flex gap-1 border-b border-border mb-6">
        {TABS.map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-all
                ${tab === t.id
                  ? "border-channel-primary text-channel-primary"
                  : "border-transparent text-text-secondary hover:text-text"
                }`}
            >
              <Icon className="w-4 h-4" />
              {t.label}
            </button>
          );
        })}
      </div>

      {tab === "providers" && <ProvidersTab />}
      {tab === "channels" && <ChannelsTab />}
      {tab === "costs" && <CostsTab />}
      {tab === "account" && <AccountTab />}
    </div>
  );
}
