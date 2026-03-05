import { ColorScheme } from "./types";

export interface ColorSchemeConfig {
  id: ColorScheme;
  name: string;
  nameEn: string;
  description: string;
  primary: string;
  primaryLight: string;
  primaryDark: string;
  accent: string;
  accentLight: string;
  bg: string;
  surface: string;
}

export const colorSchemes: Record<ColorScheme, ColorSchemeConfig> = {
  ocean: {
    id: "ocean",
    name: "深海",
    nameEn: "Ocean",
    description: "深蓝到青色渐变，适合科技",
    primary: "#2563eb",
    primaryLight: "#93c5fd",
    primaryDark: "#1e40af",
    accent: "#06b6d4",
    accentLight: "#67e8f9",
    bg: "#f0f9ff",
    surface: "#e0f2fe",
  },
  sunset: {
    id: "sunset",
    name: "落日",
    nameEn: "Sunset",
    description: "橙色到玫红，适合新闻",
    primary: "#ea580c",
    primaryLight: "#fdba74",
    primaryDark: "#c2410c",
    accent: "#e11d48",
    accentLight: "#fda4af",
    bg: "#fff7ed",
    surface: "#ffedd5",
  },
  forest: {
    id: "forest",
    name: "森林",
    nameEn: "Forest",
    description: "翠绿到深绿，适合环保/健康",
    primary: "#16a34a",
    primaryLight: "#86efac",
    primaryDark: "#15803d",
    accent: "#0d9488",
    accentLight: "#5eead4",
    bg: "#f0fdf4",
    surface: "#dcfce7",
  },
  lavender: {
    id: "lavender",
    name: "薰衣草",
    nameEn: "Lavender",
    description: "紫色到粉色，适合文化/生活",
    primary: "#9333ea",
    primaryLight: "#d8b4fe",
    primaryDark: "#7e22ce",
    accent: "#ec4899",
    accentLight: "#f9a8d4",
    bg: "#faf5ff",
    surface: "#f3e8ff",
  },
  ember: {
    id: "ember",
    name: "烬火",
    nameEn: "Ember",
    description: "红色到金色，适合财经",
    primary: "#dc2626",
    primaryLight: "#fca5a5",
    primaryDark: "#b91c1c",
    accent: "#d97706",
    accentLight: "#fcd34d",
    bg: "#fef2f2",
    surface: "#fee2e2",
  },
  arctic: {
    id: "arctic",
    name: "极光",
    nameEn: "Arctic",
    description: "浅蓝到白色，适合数据",
    primary: "#0ea5e9",
    primaryLight: "#bae6fd",
    primaryDark: "#0284c7",
    accent: "#8b5cf6",
    accentLight: "#c4b5fd",
    bg: "#f0f9ff",
    surface: "#e0f2fe",
  },
  midnight: {
    id: "midnight",
    name: "午夜",
    nameEn: "Midnight",
    description: "深紫到深蓝，暗色主题",
    primary: "#6366f1",
    primaryLight: "#a5b4fc",
    primaryDark: "#4f46e5",
    accent: "#3b82f6",
    accentLight: "#93c5fd",
    bg: "#eef2ff",
    surface: "#e0e7ff",
  },
  sakura: {
    id: "sakura",
    name: "樱花",
    nameEn: "Sakura",
    description: "粉色到桃色，适合娱乐",
    primary: "#ec4899",
    primaryLight: "#f9a8d4",
    primaryDark: "#db2777",
    accent: "#f43f5e",
    accentLight: "#fda4af",
    bg: "#fdf2f8",
    surface: "#fce7f3",
  },
};

export function getColorCSSVars(scheme: ColorScheme): Record<string, string> {
  const c = colorSchemes[scheme];
  return {
    "--channel-primary": c.primary,
    "--channel-primary-light": c.primaryLight,
    "--channel-primary-dark": c.primaryDark,
    "--channel-accent": c.accent,
    "--channel-accent-light": c.accentLight,
    "--channel-bg": c.bg,
    "--channel-surface": c.surface,
  };
}
