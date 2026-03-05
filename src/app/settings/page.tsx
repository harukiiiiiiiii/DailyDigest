import Header from "@/components/layout/Header";
import { getColorCSSVars } from "@/lib/colors";
import SettingsClient from "@/components/settings/SettingsClient";

export default function SettingsPage() {
  const colorVars = getColorCSSVars("ocean");

  return (
    <div style={colorVars as React.CSSProperties}>
      <Header />
      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        <h1 className="text-2xl font-bold mb-1">系统设置</h1>
        <p className="text-sm text-text-secondary mb-8">
          配置 AI 渠道、管理频道、查看成本统计
        </p>
        <SettingsClient />
      </main>
    </div>
  );
}
