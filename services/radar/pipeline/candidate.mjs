import { eventRelationFallback, exactDedupe } from "../dedupe/index.mjs";
import { compareEventsWithLLM, enrichWithLLM } from "../llm/provider.mjs";
import { normalizeRadarItem } from "../normalize/index.mjs";
import { freshnessScore, rankCandidate } from "../rank/index.mjs";
import {
  clampText,
  compactText,
  createFingerprint,
  detectLanguage,
  normalizeExternalUrl,
  normalizeTitle,
  uniqueTags
} from "./utils.mjs";

export const CATEGORY_TO_DOMAIN = {
  code: "CODE",
  ai: "AI_MODELS",
  game: "GAME_INTERACTION",
  hardware: "HARDWARE_EMBEDDED",
  create: "CREATIVE_MEDIA",
  science: "SCIENCE_COSMOS"
};

export const DOMAIN_TO_CATEGORY = {
  CODE: "code",
  AI_MODELS: "ai",
  GAME_INTERACTION: "game",
  HARDWARE_EMBEDDED: "hardware",
  CREATIVE_MEDIA: "create",
  SCIENCE_COSMOS: "science",
  GENERAL: "code"
};

export function prepareRadarItems(source, collectedItems) {
  const normalizedItems = collectedItems
    .map((item) => normalizeRadarItem(source, item))
    .filter((item) => preFilterItem(source, item));

  return exactDedupe(normalizedItems);
}

export function preFilterItem(source, item) {
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

export async function buildSignalCandidate(config, source, item, llm, previousItems = []) {
  const fallback = heuristicCandidate(source, item);
  const duplicateOf = await findSemanticDuplicate(llm, item, previousItems);
  let enrichment = null;

  if (llm) {
    const enrich = llm.enrich ?? enrichWithLLM;
    enrichment = await enrich(llm, source, item).catch((error) => {
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
    duplicateOf
  };
}

export function heuristicCandidate(source, item) {
  const primaryCategory = DOMAIN_TO_CATEGORY[source.domain] ?? "code";
  const topics = uniqueTags(item.tags, 6);
  const summary =
    item.excerpt
      ? clampText(compactText(item.excerpt), 100)
      : clampText(item.title, 100);

  return {
    primaryCategory,
    category: primaryCategory,
    displayTitle: "",
    topics,
    summary,
    whyItMatters: defaultWhyItMatters(source.domain),
    novelty: freshnessScore(item.publishedAt),
    editorialInterest: item.qualityScore,
    confidence: 0.45,
    language: detectLanguage(`${item.title}\n${item.excerpt}`),
    evidence: buildEvidence(item),
    flags: ["none"],
    clusterKey: createClusterKey(primaryCategory, topics, item.title)
  };
}

export function mergeCandidate(fallback, enrichment) {
  if (!enrichment) {
    return fallback;
  }

  const enrichedCategory = enrichment.primaryCategory ?? enrichment.category;
  const primaryCategory = CATEGORY_TO_DOMAIN[enrichedCategory] ? enrichedCategory : fallback.primaryCategory;
  const topics = uniqueTags(enrichment.topics?.length ? enrichment.topics : fallback.topics, 6);
  const flags = uniqueTags(enrichment.flags?.length ? enrichment.flags : fallback.flags, 6);

  return {
    primaryCategory,
    category: primaryCategory,
    displayTitle: clampText(compactText(enrichment.displayTitle ?? fallback.displayTitle), 36),
    topics,
    summary: clampText(compactText(enrichment.summary ?? fallback.summary), 140),
    whyItMatters: clampText(compactText(enrichment.whyItMatters ?? fallback.whyItMatters), 120),
    novelty: enrichment.novelty ?? fallback.novelty,
    editorialInterest: enrichment.editorialInterest ?? fallback.editorialInterest,
    confidence: enrichment.confidence ?? fallback.confidence,
    language: enrichment.language ?? fallback.language,
    evidence: enrichment.evidence?.length ? enrichment.evidence : fallback.evidence,
    flags: flags.length ? flags : ["none"],
    promptVersion: enrichment.promptVersion,
    clusterKey: createClusterKey(primaryCategory, topics, enrichment.summary ?? fallback.summary)
  };
}

export async function findSemanticDuplicate(llm, item, previousItems) {
  const candidates = previousItems.filter((previous) => fuzzyDuplicateCandidate(item, previous)).slice(0, 3);

  if (candidates.length === 0) {
    return undefined;
  }

  for (const candidate of candidates) {
    const exactRelation = eventRelationFallback(item, candidate);
    if (exactRelation.relationship === "SAME_EVENT" && exactRelation.confidence >= 0.9) {
      return candidate.id;
    }
  }

  if (!llm) {
    return undefined;
  }

  for (const candidate of candidates) {
    const compare = llm.compareEvents ?? compareEventsWithLLM;
    const relation = await compare(llm, item, candidate).catch(() => null);
    if (relation?.relationship === "SAME_EVENT" && relation.confidence >= 0.72) {
      return candidate.id;
    }
  }

  return undefined;
}

export function fuzzyDuplicateCandidate(a, b) {
  if (!a || !b || a.id === b.id) {
    return false;
  }

  if (a.canonicalUrl && b.canonicalUrl && a.canonicalUrl === b.canonicalUrl) {
    return true;
  }

  const aTitle = new Set(normalizeTitle(a.title).split(" ").filter((part) => part.length > 2));
  const bTitle = normalizeTitle(b.title).split(" ").filter((part) => part.length > 2);
  if (aTitle.size === 0 || bTitle.length === 0) {
    return false;
  }

  const overlap = bTitle.filter((part) => aTitle.has(part)).length;
  return overlap / Math.max(aTitle.size, bTitle.length) >= 0.72;
}

export function toIngestPayload(slug, source, item, candidate) {
  const domain = CATEGORY_TO_DOMAIN[candidate.primaryCategory ?? candidate.category] ?? source.domain;
  const summary = candidate.summary || item.excerpt || "";
  const thumbnailUrl = normalizeExternalUrl(item.thumbnailUrl ?? item.rawMetadata?.thumbnailUrl);
  const displayTitle = candidate.displayTitle || undefined;
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
      rawTitle: item.title,
      displayTitle,
      fingerprint: item.fingerprint,
      fetchedAt: item.fetchedAt,
      publishedAt: item.publishedAt,
      thumbnailUrl,
      summary,
      whyItMatters: candidate.whyItMatters,
      whyInteresting: candidate.whyItMatters,
      signalCandidate: {
        itemId: candidate.itemId,
        primaryCategory: candidate.primaryCategory ?? candidate.category,
        category: candidate.primaryCategory ?? candidate.category,
        topics: candidate.topics,
        novelty: candidate.novelty,
        editorialInterest: candidate.editorialInterest,
        confidence: candidate.confidence,
        language: candidate.language,
        evidence: candidate.evidence,
        flags: candidate.flags,
        clusterKey: candidate.clusterKey,
        promptVersion: candidate.promptVersion,
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

export function domainLabel(domain) {
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

export function defaultWhyItMatters(domain) {
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
