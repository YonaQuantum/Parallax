#!/usr/bin/env node

import { readFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const DEFAULT_CONFIG = "services/radar/config.local.json";
const DEFAULT_SOURCE_LIMIT = 8;
const USER_AGENT = "Parallax-Radar/0.1 (+self-hosted research community)";

async function main() {
  const flags = parseFlags(process.argv.slice(2));
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

async function runCycle(config, flags) {
  const sources = flags.includeDisabled ? config.allSources : config.sources;

  if (sources.length === 0) {
    console.log("[radar] no enabled sources");
    return;
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

  for (const source of sources) {
    try {
      const items = await collectSource(source, flags.limit ?? DEFAULT_SOURCE_LIMIT);
      console.log(`[radar] ${source.id}: ${items.length} item(s)`);

      for (const item of items) {
        const payload = toIngestPayload(config.slug, source, item);

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
}

async function collectSource(source, limit) {
  switch (source.type) {
    case "github":
    case "github-search":
      return collectGitHub(source, limit);
    case "arxiv":
      return collectArxiv(source, limit);
    case "rss":
    case "rss-or-api":
    case "model-release":
      return collectFeeds(source, limit);
    default:
      throw new Error(`unsupported source type: ${source.type}`);
  }
}

async function collectGitHub(source, limit) {
  const queries = asArray(source.queries ?? source.query);
  const items = [];

  for (const query of queries) {
    const resolvedQuery = query.replaceAll("YYYY-MM-DD", daysAgo(30));
    const url = new URL("https://api.github.com/search/repositories");
    url.searchParams.set("q", resolvedQuery);
    url.searchParams.set("sort", "stars");
    url.searchParams.set("order", "desc");
    url.searchParams.set("per_page", String(Math.min(limit, 20)));

    const json = await fetchJson(url, source.githubToken);
    for (const repo of json.items ?? []) {
      items.push({
        externalId: `github:${repo.full_name}`,
        title: repo.full_name,
        url: repo.html_url,
        summary: repo.description ?? "",
        rawText: [
          repo.full_name,
          repo.description,
          `stars: ${repo.stargazers_count}`,
          `language: ${repo.language ?? "unknown"}`,
          `updated: ${repo.updated_at}`,
          `topics: ${(repo.topics ?? []).join(", ")}`
        ].filter(Boolean).join("\n"),
        qualityScore: scoreGitHubRepo(repo),
        metadata: {
          source: source.id,
          stars: repo.stargazers_count,
          language: repo.language,
          topics: repo.topics ?? []
        },
        tags: [repo.language, ...(repo.topics ?? [])].filter(Boolean)
      });
    }
  }

  return uniqueByExternalId(items).slice(0, limit);
}

async function collectArxiv(source, limit) {
  const queries = asArray(source.queries ?? source.query);
  const items = [];

  for (const query of queries) {
    const url = new URL("https://export.arxiv.org/api/query");
    url.searchParams.set("search_query", `all:${query}`);
    url.searchParams.set("sortBy", "submittedDate");
    url.searchParams.set("sortOrder", "descending");
    url.searchParams.set("max_results", String(Math.min(limit, 20)));

    const xml = await fetchText(url);
    for (const entry of matchBlocks(xml, "entry")) {
      const id = textOf(entry, "id");
      const title = compactText(textOf(entry, "title"));
      const summary = compactText(textOf(entry, "summary"));

      if (!title || !id) {
        continue;
      }

      items.push({
        externalId: `arxiv:${id}`,
        title,
        url: id,
        summary: clampText(summary, 1200),
        rawText: clampText([title, summary, `published: ${textOf(entry, "published")}`].join("\n"), 3000),
        qualityScore: 0.74,
        metadata: {
          source: source.id,
          published: textOf(entry, "published")
        },
        tags: source.tags ?? []
      });
    }
  }

  return uniqueByExternalId(items).slice(0, limit);
}

async function collectFeeds(source, limit) {
  const feeds = asArray(source.feeds ?? source.url);

  if (feeds.length === 0) {
    throw new Error("rss source has no feeds");
  }

  const items = [];

  for (const feedUrl of feeds) {
    const xml = await fetchText(new URL(feedUrl));
    for (const item of parseFeedItems(xml)) {
      items.push({
        externalId: `rss:${item.link ?? item.title}`,
        title: item.title,
        url: item.link,
        summary: clampText(item.description, 1200),
        rawText: clampText([item.title, item.description, `published: ${item.publishedAt}`].filter(Boolean).join("\n"), 3000),
        qualityScore: source.trustScore ?? 0.66,
        metadata: {
          source: source.id,
          feed: feedUrl,
          published: item.publishedAt
        },
        tags: source.tags ?? []
      });
    }
  }

  return uniqueByExternalId(items).slice(0, limit);
}

function toIngestPayload(slug, source, item) {
  return {
    slug,
    source: {
      url: item.url,
      title: source.title ?? source.id,
      type: source.type,
      trustScore: source.trustScore ?? item.qualityScore
    },
    title: item.title,
    url: item.url,
    externalId: item.externalId,
    rawText: item.rawText,
    domain: source.domain,
    tags: uniqueTags([domainLabel(source.domain), ...(source.tags ?? []), ...(item.tags ?? [])]),
    qualityScore: item.qualityScore,
    metadata: {
      ...item.metadata,
      summary: item.summary
    }
  };
}

function domainLabel(domain) {
  const labels = {
    CODE: "编程与开源",
    AI_MODELS: "AI 与模型",
    GAME_INTERACTION: "游戏与交互",
    HARDWARE_EMBEDDED: "硬件与嵌入式",
    CREATIVE_MEDIA: "创作与媒体",
    SCIENCE_COSMOS: "科学与宇宙",
    GENERAL: "通用"
  };

  return labels[domain] ?? "通用";
}

function uniqueTags(tags) {
  const seen = new Set();
  return tags
    .filter((tag) => typeof tag === "string" && tag.trim())
    .map((tag) => tag.trim())
    .filter((tag) => {
      const key = tag.toLowerCase();
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    })
    .slice(0, 12);
}

async function postJson(config, route, body) {
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

async function fetchJson(url, token) {
  const response = await fetch(url, {
    headers: cleanHeaders({
      "accept": "application/vnd.github+json",
      "authorization": token ? `Bearer ${token}` : undefined,
      "user-agent": USER_AGENT
    })
  });

  if (!response.ok) {
    throw new Error(`${url.host} ${response.status}: ${await response.text()}`);
  }

  return response.json();
}

async function fetchText(url) {
  const response = await fetch(url, {
    headers: {
      "user-agent": USER_AGENT
    }
  });

  if (!response.ok) {
    throw new Error(`${url.host} ${response.status}: ${await response.text()}`);
  }

  return response.text();
}

function normalizeConfig(raw, flags) {
  if (Array.isArray(raw.radars)) {
    const selected =
      raw.radars.find((radar) => radar.slug === flags.slug) ??
      raw.radars.find((radar) => radar.enabled) ??
      raw.radars[0];
    const githubTokenEnv = selected?.providers?.github?.tokenEnv;
    return {
      baseUrl: process.env.PARALLAX_BASE_URL ?? "http://127.0.0.1:3000",
      sharedSecretEnv: "RADAR_SHARED_SECRET",
      sharedSecret: process.env.RADAR_SHARED_SECRET,
      slug: selected.slug,
      name: selected.name ?? selected.slug,
      heartbeatSeconds: 60,
      allSources: normalizeSources(selected.sources ?? [], githubTokenEnv),
      sources: normalizeSources(selected.sources ?? [], githubTokenEnv).filter((source) => source.enabled)
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
    allSources: sources,
    sources: sources.filter((source) => source.enabled)
  };
}

function normalizeSources(sources, githubTokenEnv) {
  return sources.map((source, index) => ({
    ...source,
    id: source.id ?? `${source.type}-${index + 1}`,
    enabled: source.enabled ?? false,
    githubToken: githubTokenEnv ? process.env[githubTokenEnv] : undefined
  }));
}

function parseFeedItems(xml) {
  const rssItems = matchBlocks(xml, "item").map((item) => ({
    title: compactText(textOf(item, "title")),
    link: compactText(textOf(item, "link")),
    description: stripHtml(compactText(textOf(item, "description") || textOf(item, "content:encoded"))),
    publishedAt: compactText(textOf(item, "pubDate") || textOf(item, "dc:date"))
  }));
  const atomItems = matchBlocks(xml, "entry").map((entry) => ({
    title: compactText(textOf(entry, "title")),
    link: atomLink(entry) || compactText(textOf(entry, "id")),
    description: stripHtml(compactText(textOf(entry, "summary") || textOf(entry, "content"))),
    publishedAt: compactText(textOf(entry, "published") || textOf(entry, "updated"))
  }));

  return [...rssItems, ...atomItems].filter((item) => item.title);
}

function matchBlocks(xml, tag) {
  return [...xml.matchAll(new RegExp(`<${escapeRegex(tag)}\\b[^>]*>([\\s\\S]*?)</${escapeRegex(tag)}>`, "gi"))].map((match) => match[1]);
}

function textOf(xml, tag) {
  const match = xml.match(new RegExp(`<${escapeRegex(tag)}\\b[^>]*>([\\s\\S]*?)</${escapeRegex(tag)}>`, "i"));
  return decodeXml(match?.[1] ?? "");
}

function atomLink(entry) {
  const match = entry.match(/<link\b[^>]*href=["']([^"']+)["'][^>]*>/i);
  return decodeXml(match?.[1] ?? "");
}

function uniqueByExternalId(items) {
  const seen = new Set();
  return items.filter((item) => {
    const key = item.externalId ?? item.url ?? item.title;
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

function scoreGitHubRepo(repo) {
  const stars = Math.max(0, repo.stargazers_count ?? 0);
  const starScore = Math.min(0.32, Math.log10(stars + 1) / 14);
  const freshnessScore = Date.now() - new Date(repo.updated_at).getTime() < 14 * 24 * 60 * 60 * 1000 ? 0.08 : 0;
  return Math.min(0.92, 0.54 + starScore + freshnessScore);
}

function parseFlags(args) {
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

function daysAgo(days) {
  const date = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  return date.toISOString().slice(0, 10);
}

function asArray(value) {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

function compactText(value) {
  return decodeXml(value).replace(/\s+/g, " ").trim();
}

function stripHtml(value) {
  return value.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function decodeXml(value) {
  return value
    .replaceAll("<![CDATA[", "")
    .replaceAll("]]>", "")
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/&#x([\da-f]+);/gi, (_, code) => String.fromCodePoint(Number.parseInt(code, 16)))
    .replaceAll("&amp;", "&")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&quot;", "\"")
    .replaceAll("&#39;", "'");
}

function clampText(value, maxLength) {
  if (value.length <= maxLength) {
    return value;
  }

  return `${value.slice(0, maxLength - 1).trim()}…`;
}

function cleanHeaders(headers) {
  return Object.fromEntries(Object.entries(headers).filter(([, value]) => value));
}

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

main().catch((error) => {
  console.error(`[radar] ${error.stack ?? error.message}`);
  process.exitCode = 1;
});
