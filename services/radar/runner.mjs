#!/usr/bin/env node

import { readFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import process from "node:process";
import { fetchContentForItem } from "./fetch/content.mjs";
import { createLLM } from "./llm/provider.mjs";
import {
  buildSignalCandidate,
  prepareRadarItems,
  toIngestPayload
} from "./pipeline/candidate.mjs";
import { readEnvFromName } from "./pipeline/utils.mjs";
import { collectSource } from "./sources/index.mjs";

const DEFAULT_CONFIG = "services/radar/config.local.json";
const DEFAULT_SOURCE_LIMIT = 8;
export const USER_AGENT = "Parallax-Radar/0.1 (+self-hosted research community)";

export async function main(argv = process.argv.slice(2)) {
  const flags = parseFlags(argv);
  const configPath = flags.config ?? process.env.RADAR_CONFIG_PATH ?? DEFAULT_CONFIG;
  const config = normalizeConfig(JSON.parse(await readFile(path.resolve(configPath), "utf8")), flags);

  if (flags.once) {
    await runCycle(config, flags);
    return;
  }

  console.log(`[radar] running as ${config.slug}; press Ctrl+C to stop`);
  const lastRuns = new Map();

  for (;;) {
    const now = Date.now();
    const dueSources = config.sources.filter((source) => {
      const intervalMs = (source.heartbeatSeconds ?? config.heartbeatSeconds) * 1000;
      return now - (lastRuns.get(source.id) ?? 0) >= intervalMs;
    });

    if (dueSources.length > 0) {
      await runCycle({ ...config, sources: dueSources }, flags);
      dueSources.forEach((source) => lastRuns.set(source.id, Date.now()));
    }

    await sleep(60_000);
  }
}

export async function runCycle(config, flags = {}) {
  const sources = flags.includeDisabled ? config.allSources : config.sources;
  const llm = createLLM(config);
  const seenItems = [];

  if (sources.length === 0) {
    console.log("[radar] no enabled sources");
    return [];
  }

  if (!flags.dryRun) {
    await postJson(config, "/api/radar/heartbeat", {
      slug: config.slug,
      name: config.name,
      heartbeatSeconds: Math.min(config.heartbeatSeconds, 3600),
      scopes: {
        sources: sources.map((source) => source.id)
      }
    });
  }

  const published = [];

  for (const source of sources) {
    try {
      const collectedItems = await collectSource(source, flags.limit ?? DEFAULT_SOURCE_LIMIT, {
        userAgent: USER_AGENT
      });
      const items = prepareRadarItems(source, collectedItems);
      console.log(
        `[radar] ${source.id}: ${collectedItems.length} collected, ${items.length} candidate(s)`
      );

      for (const item of items) {
        const enrichedItem = await fetchContentForItem(source, item, {
          userAgent: USER_AGENT
        });
        const candidate = await buildSignalCandidate(config, source, enrichedItem, llm, seenItems);
        seenItems.push(enrichedItem);

        if (candidate.duplicateOf) {
          console.log(`[radar] ${source.id}: skipped semantic duplicate ${enrichedItem.id}`);
          continue;
        }

        const payload = toIngestPayload(config.slug, source, enrichedItem, candidate);
        published.push(payload);

        if (flags.dryRun) {
          console.log(JSON.stringify(payload, null, 2));
          continue;
        }

        await postJson(config, "/api/radar/ingest", payload);
      }
    } catch (error) {
      console.error(`[radar] ${source.id}: ${error.message}`);
    }
  }

  return published;
}

export async function postJson(config, route, body) {
  if (!config.baseUrl) {
    throw new Error("missing parallax.baseUrl or PARALLAX_BASE_URL");
  }

  if (!config.sharedSecret) {
    throw new Error(`missing shared secret env: ${config.sharedSecretEnv}`);
  }

  const response = await fetch(new URL(route, config.baseUrl), {
    method: "POST",
    headers: {
      "authorization": `Bearer ${config.sharedSecret}`,
      "content-type": "application/json",
      "user-agent": USER_AGENT
    },
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    throw new Error(`${route} ${response.status}: ${await response.text()}`);
  }

  return response.json();
}

export function normalizeConfig(raw, flags = {}) {
  if (Array.isArray(raw.radars)) {
    const selected =
      raw.radars.find((radar) => radar.slug === flags.slug) ??
      raw.radars.find((radar) => radar.enabled) ??
      raw.radars[0];
    const githubTokenEnv = selected?.providers?.github?.tokenEnv;
    const sources = normalizeSources(selected.sources ?? [], githubTokenEnv);
    const rankingWeights = selected.rankingWeights ?? selected.rank?.weights;

    return {
      baseUrl: process.env.PARALLAX_BASE_URL ?? "http://127.0.0.1:3000",
      sharedSecretEnv: "RADAR_SHARED_SECRET",
      sharedSecret: process.env.RADAR_SHARED_SECRET,
      slug: selected.slug,
      name: selected.name ?? selected.slug,
      heartbeatSeconds: selected.heartbeatSeconds ?? 60,
      rankingWeights,
      rank: selected.rank,
      models: selected.models,
      allSources: sources,
      sources: sources.filter((source) => source.enabled)
    };
  }

  const appConfig = raw.parallax;
  const sharedSecretEnv = appConfig?.sharedSecretEnv ?? "RADAR_SHARED_SECRET";
  const githubTokenEnv = raw.providers?.github?.tokenEnv ?? "GITHUB_TOKEN";
  const sources = normalizeSources(raw.sources ?? [], githubTokenEnv);

  return {
    baseUrl: process.env.PARALLAX_BASE_URL ?? appConfig?.baseUrl,
    sharedSecretEnv,
    sharedSecret: process.env[sharedSecretEnv],
    slug: flags.slug ?? raw.runtime?.slug ?? "local-researcher",
    name: raw.runtime?.name ?? flags.slug ?? raw.runtime?.slug ?? "local-researcher",
    heartbeatSeconds: raw.runtime?.heartbeatSeconds ?? 60,
    rankingWeights: raw.rankingWeights,
    rank: raw.rank,
    models: raw.models,
    allSources: sources,
    sources: sources.filter((source) => source.enabled)
  };
}

export function normalizeSources(sources, githubTokenEnv) {
  return sources.map((source, index) => ({
    ...source,
    id: source.id ?? `${source.type}-${index + 1}`,
    enabled: source.enabled ?? false,
    githubToken: githubTokenEnv ? readEnvFromName(githubTokenEnv) : undefined
  }));
}

export function parseFlags(args) {
  const flags = {
    once: false,
    dryRun: false,
    includeDisabled: false
  };

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === "--once") flags.once = true;
    else if (arg === "--dry-run") flags.dryRun = true;
    else if (arg === "--include-disabled") flags.includeDisabled = true;
    else if (arg === "--config") flags.config = args[++index];
    else if (arg === "--slug") flags.slug = args[++index];
    else if (arg === "--limit") flags.limit = Number(args[++index]);
  }

  return flags;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(`[radar] ${error.stack ?? error.message}`);
    process.exitCode = 1;
  });
}
