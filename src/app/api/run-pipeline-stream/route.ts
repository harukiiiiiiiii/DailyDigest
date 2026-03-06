import { NextRequest } from "next/server";
import { getChannel } from "@/lib/channels";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const { channelId, date } = await req.json();

  if (!channelId || !date) {
    return new Response(JSON.stringify({ error: "Missing channelId or date" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const channel = getChannel(channelId);
  if (!channel) {
    return new Response(JSON.stringify({ error: `Channel "${channelId}" not found` }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      function send(event: Record<string, unknown>) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
      }

      try {
        const { runChannel } = await import("../../../../pipeline/runner");

        channel.agentCombo = ["gemini"];
        channel.integrationModel = "gemini";

        const digest = await runChannel(channel, date, false, undefined, undefined, (evt) => {
          send(evt);
        });

        send({
          phase: "complete",
          articles: digest.articles.length,
          topic: digest.topic,
          cost: digest.meta.cost_usd,
        });
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        send({ phase: "error", message: msg });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
