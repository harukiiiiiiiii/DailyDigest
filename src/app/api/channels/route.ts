import { NextResponse } from "next/server";
import { getAllChannels } from "@/lib/channels";

export async function GET() {
  return NextResponse.json(getAllChannels());
}
