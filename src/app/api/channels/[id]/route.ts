import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { channels } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const body = await req.json();

  const existing = db.select({ id: channels.id }).from(channels).where(eq(channels.id, id)).get();
  if (!existing) {
    return NextResponse.json({ error: "Channel not found" }, { status: 404 });
  }

  db.update(channels)
    .set({
      name: body.name,
      nameEn: body.nameEn,
      description: body.description,
      icon: body.icon,
      template: body.template,
      colorScheme: body.colorScheme,
      keywords: body.keywords,
      sources: body.sources,
      searchPrompt: body.searchPrompt,
      agentCombo: body.agentCombo,
      integrationModel: body.integrationModel,
      modelBindings: body.modelBindings ?? null,
      integrationBinding: body.integrationBinding ?? null,
    })
    .where(eq(channels.id, id))
    .run();

  return NextResponse.json({ success: true });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const existing = db.select({ id: channels.id }).from(channels).where(eq(channels.id, id)).get();
  if (!existing) {
    return NextResponse.json({ error: "Channel not found" }, { status: 404 });
  }

  db.delete(channels).where(eq(channels.id, id)).run();

  const remaining = db.select({ id: channels.id }).from(channels).all().length;
  return NextResponse.json({ success: true, remaining });
}
