#!/usr/bin/env tsx
/**
 * CLI entry point for the Daily Digest pipeline.
 *
 * Usage:
 *   npx tsx pipeline/run.ts                                           # all channels, today
 *   npx tsx pipeline/run.ts --channel ai                               # single channel
 *   npx tsx pipeline/run.ts --date 2026-03-05                          # specific date
 *   npx tsx pipeline/run.ts --agents gemini                            # only use specific agents
 *   npx tsx pipeline/run.ts --model gemini                             # override integration model
 *   npx tsx pipeline/run.ts --agent-models gemini=gemini-2.5-pro         # override search agent models
 *   npx tsx pipeline/run.ts --integration-model gemini-3.1-pro-preview  # override integration model name
 *   npx tsx pipeline/run.ts --dry-run                                   # don't write files
 */
import "dotenv/config";
import { runAll, runChannel } from "./runner";
import fs from "fs";
import path from "path";
import type { ChannelConfig } from "./types";

function parseArgs() {
  const args = process.argv.slice(2);
  const opts: {
    channel?: string;
    date?: string;
    agents?: string[];
    model?: string;
    agentModels?: Record<string, string>;
    integrationModel?: string;
    dryRun: boolean;
  } = { dryRun: false };

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case "--channel":
      case "-c":
        opts.channel = args[++i];
        break;
      case "--date":
      case "-d":
        opts.date = args[++i];
        break;
      case "--agents":
      case "-a":
        opts.agents = args[++i]?.split(",");
        break;
      case "--model":
      case "-m":
        opts.model = args[++i];
        break;
      case "--agent-models":
        opts.agentModels = parseKVPairs(args[++i]);
        break;
      case "--integration-model":
        opts.integrationModel = args[++i];
        break;
      case "--dry-run":
        opts.dryRun = true;
        break;
    }
  }

  return opts;
}

/** Parse "key=val,key=val" into Record<string,string> */
function parseKVPairs(input?: string): Record<string, string> {
  if (!input) return {};
  const map: Record<string, string> = {};
  for (const pair of input.split(",")) {
    const [k, v] = pair.split("=");
    if (k && v) map[k.trim()] = v.trim();
  }
  return map;
}

async function main() {
  const opts = parseArgs();
  const date = opts.date ?? new Date().toISOString().split("T")[0];

  if (opts.agentModels && Object.keys(opts.agentModels).length > 0) {
    console.log(`Model overrides: ${Object.entries(opts.agentModels).map(([k, v]) => `${k}=${v}`).join(", ")}`);
  }

  if (opts.channel) {
    const channelsPath = path.join(process.cwd(), "data", "channels.json");
    const channels: ChannelConfig[] = JSON.parse(
      fs.readFileSync(channelsPath, "utf-8"),
    );
    const ch = channels.find((c) => c.id === opts.channel);
    if (!ch) {
      console.error(`Channel "${opts.channel}" not found.`);
      console.error(`Available: ${channels.map((c) => c.id).join(", ")}`);
      process.exit(1);
    }
    if (opts.agents) ch.agentCombo = opts.agents;
    if (opts.model) ch.integrationModel = opts.model;
    await runChannel(ch, date, opts.dryRun, opts.agentModels, opts.integrationModel);
  } else {
    await runAll(date, opts.dryRun, opts.agents, opts.model, opts.agentModels, opts.integrationModel);
  }
}

main().catch((err) => {
  console.error("\n✗ Pipeline failed:", err.message ?? err);
  process.exit(1);
});
