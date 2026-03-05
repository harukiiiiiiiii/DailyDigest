import { NextRequest, NextResponse } from "next/server";
import { getSettings, saveSettings } from "@/lib/settings";

export async function GET() {
  try {
    const settings = getSettings();
    // mask API keys for the frontend — only show last 4 chars
    const masked = {
      ...settings,
      providers: settings.providers.map((p) => ({
        ...p,
        apiKey: p.apiKey ? `***${p.apiKey.slice(-4)}` : "",
      })),
    };
    return NextResponse.json(masked);
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const current = getSettings();

    // merge providers — if apiKey is masked (starts with ***), keep the existing one
    if (body.providers) {
      body.providers = body.providers.map((p: { id: string; apiKey: string }) => {
        const existing = current.providers.find((e) => e.id === p.id);
        if (p.apiKey.startsWith("***") && existing) {
          return { ...p, apiKey: existing.apiKey };
        }
        return p;
      });
    }

    const updated = { ...current, ...body };
    saveSettings(updated);
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
