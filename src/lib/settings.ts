import fs from "fs";
import path from "path";
import type { GlobalSettings } from "./types";

const SETTINGS_PATH = path.join(process.cwd(), "data", "settings.json");

export function getSettings(): GlobalSettings {
  const raw = fs.readFileSync(SETTINGS_PATH, "utf-8");
  return JSON.parse(raw);
}

export function saveSettings(settings: GlobalSettings): void {
  fs.writeFileSync(SETTINGS_PATH, JSON.stringify(settings, null, 2), "utf-8");
}
