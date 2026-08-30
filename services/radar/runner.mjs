#!/usr/bin/env node

import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const DEFAULT_CONFIG = "services/radar/config.local.json";
const DEFAULT_SOURCE_LIMIT = 8;
const USER_AGENT = "Parallax-Radar/0.1 (+self-hosted research community)";
const CATEGORY_TO_DOMAIN = {
  code: "CODE",
  ai: "AI_MODELS",
  game: "GAME_INTERACTION",
  hardware: "HARDWARE_EMBEDDED",
  create: "CREATIVE_MEDIA",
  science: "SCIENCE_COSMOS"
};
const DOMAIN_TO_CATEGORY = {
  CODE: "code",
  AI_MODELS: "ai",
  GAME_INTERACTION: "game",
  HARDWARE_EMBEDDED: "hardware",
  CREATIVE_MEDIA: "create",
  SCIENCE_COSMOS: "science",
  GENERAL: "code"
};

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
  const llm = createLLM(config);

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
      const collectedItems = await collectSource(source, flags.limit ?? DEFAULT_SOURCE_LIMIT);
      const normalizedItems = collectedItems
        .map((item) => normalizeRadarItem(source, item))
        .filter((item) => preFilterItem(source, item));
      const items = exactDedupe(normalizedItems);
      console.log(
        `[radar] ${source.id}: ${collectedItems.length} collected, ${items.length} candidate(s)`
      );

      for (const item of items) {
        const candidate = await buildSignalCandidate(config, source, item, llm);
        const payload = toIngestPayload(config.slug, source, item, candidate);

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

function normalizeRadarItem(source, item) {
  const canonicalUrl = canonicalizeUrl(item.url);
  const publishedAt = parseDate(item.metadata?.published ?? item.metadata?.updated ?? item.publishedAt);
  const title = compactText(item.title ?? "");
  const content = clampText(item.rawText ?? item.summary ?? title, 6000);
  const rawMetadata = item.metadata ?? {};
  const metrics = normalizeMetrics(rawMetadata);
  const fingerprint = createFingerprint([
    source.id,
    item.externalId,
    canonicalUrl,
    normalizeTitle(title),
    createFingerprint([content])
  ]);

  return {
    id: item.externalId ?? fingerprint,
    source: source.id,
    sourceType: source.type,
    title,
    url: item.url,
    canonicalUrl,
    author: item.author,
    publishedAt,
    fetchedAt: new Date().toISOString(),
    excerpt: item.summary ?? "",
    content,
    metrics,
    rawMetadata,
    fingerprint,
    externalId: item.externalId,
    qualityScore: item.qualityScore ?? source.trustScore ?? 0.5,
    tags: uniqueTags([...(source.tags ?? []), ...(item.tags ?? [])])
  };
}

function preFilterItem(source, item) {
  if (!item.title || item.title.length < 3) {
    return false;
  }

  if (!item.url && !item.externalId) {
    return false;
  }

  if ((source.trustScore ?? item.qualityScore ?? 0.5) < 0.15) {
    return false;
  }

  return true;
}

function exactDedupe(items) {
  const seen = new Set();
  return items.filter((item) => {
    const keys = [
      item.externalId && `external:${item.externalId}`,
      item.canonicalUrl && `url:${item.canonicalUrl}`,
      `fingerprint:${item.fingerprint}`
    ].filter(Boolean);
    const duplicate = keys.some((key) => seen.has(key));

    keys.forEach((key) => seen.add(key));
    return !duplicate;
  });
}

async function buildSignalCandidate(config, source, item, llm) {
  const fallback = heuristicCandidate(source, item);
  let enrichment = null;

  if (llm) {
    enrichment = await enrichWithLLM(llm, source, item).catch((error) => {
      console.error(`[radar] ${source.id}: llm enrich skipped: ${error.message}`);
      return null;
    });
  }

  const candidate = mergeCandidate(fallback, enrichment);
  const ranked = rankCandidate(config, source, item, candidate);

  return {
    ...candidate,
    ...ranked,
    itemId: item.id,
    duplicateOf: undefined
  };
}

function heuristicCandidate(source, item) {
  const category = DOMAIN_TO_CATEGORY[source.domain] ?? "code";
  const topics = uniqueTags(item.tags).slice(0, 6);
  const summary =
    item.excerpt
      ? clampText(compactText(item.excerpt), 100)
      : clampText(item.title, 100);

  return {
    category,
    topics,
    summary,
    whyItMatters: defaultWhyItMatters(source.domain),
    novelty: freshnessScore(item.publishedAt),
    editorialInterest: item.qualityScore,
    confidence: 0.45,
    language: detectLanguage(`${item.title}\n${item.excerpt}`),
    evidence: buildEvidence(item),
    flags: ["none"],
    clusterKey: createClusterKey(category, topics, item.title)
  };
}

function mergeCandidate(fallback, enrichment) {
  if (!enrichment) {
    return fallback;
  }

  const category = CATEGORY_TO_DOMAIN[enrichment.category] ? enrichment.category : fallback.category;
  const topics = uniqueTags(enrichment.topics?.length ? enrichment.topics : fallback.topics).slice(0, 6);
  const flags = uniqueTags(enrichment.flags?.length ? enrichment.flags : fallback.flags).slice(0, 6);

  return {
    category,
    topics,
    summary: clampText(compactText(enrichment.summary ?? fallback.summary), 140),
    whyItMatters: clampText(compactText(enrichment.why_it_matters ?? fallback.whyItMatters), 120),
    novelty: clampNumber(enrichment.novelty, 0, 1, fallback.novelty),
    editorialInterest: clampNumber(enrichment.editorial_interest, 0, 1, fallback.editorialInterest),
    confidence: clampNumber(enrichment.confidence, 0, 1, fallback.confidence),
    language: enrichment.language ?? fallback.language,
    evidence: Array.isArray(enrichment.evidence) && enrichment.evidence.length
      ? enrichment.evidence.map((item) => clampText(compactText(String(item)), 140)).slice(0, 3)
      : fallback.evidence,
    flags: flags.length ? flags : ["none"],
    clusterKey: createClusterKey(category, topics, enrichment.summary ?? fallback.summary)
  };
}

function rankCandidate(config, source, item, candidate) {
  const score = {
    recency: freshnessScore(item.publishedAt),
    momentum: momentumScore(item.metrics),
    sourceQuality: source.trustScore ?? item.qualityScore ?? 0.5,
    novelty: candidate.novelty,
    communityFit: communityFitScore(source.domain, candidate.topics, item),
    editorialInterest: candidate.editorialInterest
  };
  const weights = config.rankingWeights ?? {
    recency: 0.25,
    momentum: 0.2,
    sourceQuality: 0.15,
    novelty: 0.15,
    communityFit: 0.15,
    editorialInterest: 0.1
  };
  const finalScore = Object.entries(weights).reduce(
    (total, [key, weight]) => total + (score[key] ?? 0) * weight,
    0
  );

  return {
    signalScore: clampNumber(finalScore, 0, 1, 0.5),
    scoreBreakdown: score,
    scoreWeights: weights
  };
}

function createLLM(config) {
  const chat = config.models?.chat ?? {};
  const enabled = parseBoolean(process.env.RADAR_LLM_ENABLED ?? chat.enabled, false);

  if (!enabled) {
    return null;
  }

  const provider = process.env.RADAR_LLM_PROVIDER ?? chat.provider ?? "openai-compatible";
  if (provider !== "openai-compatible") {
    console.error(`[radar] unsupported llm provider: ${provider}`);
    return null;
  }

  const baseUrl = process.env.RADAR_LLM_BASE_URL ?? readEnvFromName(chat.baseUrlEnv);
  const apiKey = process.env.RADAR_LLM_API_KEY ?? readEnvFromName(chat.apiKeyEnv);
  const model = process.env.RADAR_LLM_MODEL ?? chat.model;

  if (!baseUrl || !apiKey || !model) {
    console.error("[radar] llm disabled: missing RADAR_LLM_BASE_URL, RADAR_LLM_API_KEY, or RADAR_LLM_MODEL");
    return null;
  }

  return {
    provider,
    baseUrl,
    apiKey,
    model,
    timeoutMs: Number(process.env.RADAR_LLM_TIMEOUT_MS ?? chat.timeoutMs ?? 20_000),
    temperature: Number(process.env.RADAR_LLM_TEMPERATURE ?? chat.temperature ?? 0.2)
  };
}

async function enrichWithLLM(llm, source, item) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), llm.timeoutMs);

  try {
    const response = await fetch(chatCompletionsUrl(llm.baseUrl), {
      method: "POST",
      headers: {
        "authorization": `Bearer ${llm.apiKey}`,
        "content-type": "application/json",
        "user-agent": USER_AGENT
      },
      body: JSON.stringify({
        model: llm.model,
        temperature: llm.temperature,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content: [
              "You are Parallax Radar's semantic analysis engine.",
              "Parallax Radar observes developments in technology, open source, AI, games, hardware, creative work, science and related ideas.",
              "Your job is not to write news articles. Transform a source item into structured editorial metadata.",
              "Use only facts contained in the supplied source content and metadata.",
              "Never invent dates, numbers, people, organizations, features or claims.",
              "If information is uncertain, lower confidence.",
              "Do not use sensational or marketing language.",
              "Preserve the distinction between facts and interpretation.",
              "Return structured JSON only."
            ].join("\n")
          },
          {
            role: "user",
            content: buildEnrichPrompt(source, item)
          }
        ]
      }),
      signal: controller.signal
    });

    if (!response.ok) {
      throw new Error(`llm ${response.status}: ${await response.text()}`);
    }

    const json = await response.json();
    return parseJsonObject(json.choices?.[0]?.message?.content ?? "");
  } finally {
    clearTimeout(timeout);
  }
}

function buildEnrichPrompt(source, item) {
  return [
    "Analyse the following candidate event.",
    "",
    "SOURCE",
    JSON.stringify({
      id: source.id,
      title: source.title,
      type: source.type,
      domain: source.domain,
      trustScore: source.trustScore
    }),
    "",
    "TITLE",
    item.title,
    "",
    "URL",
    item.url ?? "",
    "",
    "PUBLISHED_AT",
    item.publishedAt ?? "",
    "",
    "METRICS",
    JSON.stringify(item.metrics ?? {}),
    "",
    "CONTENT",
    clampText(item.content ?? item.excerpt ?? "", 4200),
    "",
    "Return JSON with exactly these keys:",
    "{",
    "  \"category\": \"code | ai | game | hardware | create | science\",",
    "  \"topics\": [\"maximum 6 concise topic names\"],",
    "  \"summary\": \"用简洁中文说明发生了什么，50-100字\",",
    "  \"why_it_matters\": \"说明它为什么可能值得 Parallax 用户关注，最多80字\",",
    "  \"novelty\": 0.0,",
    "  \"editorial_interest\": 0.0,",
    "  \"confidence\": 0.0,",
    "  \"language\": \"zh-CN | en | mixed | unknown\",",
    "  \"evidence\": [\"最多3条直接来自输入的事实依据\"],",
    "  \"flags\": [\"rumor | secondary_source | promotional | insufficient_context | paywalled | duplicated_claim | none\"]",
    "}"
  ].join("\n");
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

function toIngestPayload(slug, source, item, candidate) {
  const domain = CATEGORY_TO_DOMAIN[candidate.category] ?? source.domain;
  const summary = candidate.summary || item.excerpt || "";
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
    rawText: item.content,
    domain,
    tags: uniqueTags([
      domainLabel(domain),
      ...(source.tags ?? []),
      ...(item.tags ?? []),
      ...(candidate.topics ?? [])
    ]),
    qualityScore: candidate.signalScore,
    metadata: {
      ...item.rawMetadata,
      canonicalUrl: item.canonicalUrl,
      fingerprint: item.fingerprint,
      fetchedAt: item.fetchedAt,
      publishedAt: item.publishedAt,
      summary,
      whyItMatters: candidate.whyItMatters,
      signalCandidate: {
        itemId: candidate.itemId,
        category: candidate.category,
        topics: candidate.topics,
        novelty: candidate.novelty,
        editorialInterest: candidate.editorialInterest,
        confidence: candidate.confidence,
        language: candidate.language,
        evidence: candidate.evidence,
        flags: candidate.flags,
        clusterKey: candidate.clusterKey,
        duplicateOf: candidate.duplicateOf ?? null
      },
      ranking: {
        score: candidate.signalScore,
        breakdown: candidate.scoreBreakdown,
        weights: candidate.scoreWeights
      }
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

function canonicalizeUrl(value) {
  if (!value) {
    return "";
  }

  try {
    const url = new URL(value);
    url.hash = "";
    for (const key of [...url.searchParams.keys()]) {
      if (
        key.startsWith("utm_") ||
        ["fbclid", "gclid", "mc_cid", "mc_eid", "ref", "source"].includes(key)
      ) {
        url.searchParams.delete(key);
      }
    }
    url.hostname = url.hostname.toLowerCase();
    return url.toString().replace(/\/$/, "");
  } catch {
    return value.trim();
  }
}

function normalizeTitle(value) {
  return compactText(value).toLowerCase().replace(/[^\p{Letter}\p{Number}]+/gu, " ").trim();
}

function normalizeMetrics(metadata) {
  return {
    stars: finiteNumber(metadata.stars),
    starsDelta24h: finiteNumber(metadata.starsDelta24h),
    downloads: finiteNumber(metadata.downloads),
    comments: finiteNumber(metadata.comments),
    score: finiteNumber(metadata.score)
  };
}

function finiteNumber(value) {
  return Number.isFinite(value) ? Number(value) : undefined;
}

function parseDate(value) {
  if (!value) {
    return undefined;
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
}

function createFingerprint(parts) {
  return createHash("sha256")
    .update(parts.filter(Boolean).join("\n"))
    .digest("hex");
}

function freshnessScore(publishedAt) {
  if (!publishedAt) {
    return 0.38;
  }

  const ageHours = Math.max(0, (Date.now() - new Date(publishedAt).getTime()) / 3_600_000);
  if (ageHours <= 24) return 1;
  if (ageHours <= 72) return 0.82;
  if (ageHours <= 168) return 0.64;
  if (ageHours <= 720) return 0.42;
  return 0.22;
}

function momentumScore(metrics) {
  const starsDelta = metrics?.starsDelta24h ?? 0;
  const stars = metrics?.stars ?? 0;
  const downloads = metrics?.downloads ?? 0;
  const comments = metrics?.comments ?? 0;
  const explicitScore = metrics?.score ?? 0;

  return clampNumber(
    Math.max(
      Math.log10(starsDelta + 1) / 4,
      Math.log10(stars + 1) / 8,
      Math.log10(downloads + 1) / 8,
      Math.log10(comments + 1) / 4,
      explicitScore
    ),
    0,
    1,
    0
  );
}

function communityFitScore(domain, topics, item) {
  const text = `${domain ?? ""} ${topics.join(" ")} ${item.title} ${item.excerpt}`.toLowerCase();
  const matches = [
    "github",
    "开源",
    "model",
    "ai",
    "agent",
    "game",
    "shader",
    "linux",
    "hardware",
    "blender",
    "nasa",
    "science",
    "cosmos",
    "philosophy"
  ].filter((keyword) => text.includes(keyword)).length;

  return clampNumber(0.42 + matches * 0.08, 0, 1, 0.5);
}

function defaultWhyItMatters(domain) {
  const text = {
    CODE: "可能影响开源工程、工具链或开发实践。",
    AI_MODELS: "可能影响模型、推理、训练或智能体工作流。",
    GAME_INTERACTION: "可能为游戏技术、实时模拟或交互设计提供线索。",
    HARDWARE_EMBEDDED: "可能连接软件、硬件和可实际制作的技术实践。",
    CREATIVE_MEDIA: "可能为创作工具、声音、图形或媒体工作流提供参考。",
    SCIENCE_COSMOS: "可能扩展社区对科学、宇宙和长期问题的观察。",
    GENERAL: "可能成为社区讨论或后续研究的线索。"
  };

  return text[domain] ?? text.GENERAL;
}

function buildEvidence(item) {
  return [
    item.title,
    item.publishedAt ? `published: ${item.publishedAt}` : "",
    item.metrics?.stars ? `stars: ${item.metrics.stars}` : ""
  ].filter(Boolean).slice(0, 3);
}

function createClusterKey(category, topics, text) {
  return createFingerprint([
    category,
    topics.slice(0, 2).join("|"),
    normalizeTitle(text).split(" ").slice(0, 8).join(" ")
  ]).slice(0, 16);
}

function detectLanguage(text) {
  if (/[\u4e00-\u9fff]/.test(text) && /[a-z]/i.test(text)) return "mixed";
  if (/[\u4e00-\u9fff]/.test(text)) return "zh-CN";
  if (/[a-z]/i.test(text)) return "en";
  return "unknown";
}

function chatCompletionsUrl(baseUrl) {
  const trimmed = baseUrl.replace(/\/$/, "");
  if (trimmed.endsWith("/chat/completions")) {
    return trimmed;
  }
  if (trimmed.endsWith("/v1")) {
    return `${trimmed}/chat/completions`;
  }
  return `${trimmed}/v1/chat/completions`;
}

function parseJsonObject(content) {
  const cleaned = content
    .trim()
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```$/i, "")
    .trim();
  return JSON.parse(cleaned);
}

function clampNumber(value, min, max, fallback) {
  const number = Number(value);
  if (!Number.isFinite(number)) {
    return fallback;
  }

  return Math.min(max, Math.max(min, number));
}

function parseBoolean(value, fallback) {
  if (typeof value === "boolean") {
    return value;
  }
  if (typeof value !== "string") {
    return fallback;
  }

  return ["1", "true", "yes", "on"].includes(value.toLowerCase());
}

function readEnvFromName(name) {
  return name ? process.env[name] : undefined;
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
