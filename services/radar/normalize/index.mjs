import {
  canonicalizeUrl,
  clampText,
  compactText,
  createFingerprint,
  normalizeTitle,
  parseDate,
  resolveExternalUrl,
  uniqueTags
} from "../pipeline/utils.mjs";

export function normalizeRadarItem(source, item) {
  const canonicalUrl = canonicalizeUrl(item.url);
  const publishedAt = parseDate(item.metadata?.published ?? item.metadata?.updated ?? item.publishedAt);
  const title = compactText(item.title ?? "");
  const content = clampText(item.rawText ?? item.summary ?? title, 6000);
  const rawMetadata = item.metadata ?? {};
  const metrics = normalizeMetrics(rawMetadata);
  const thumbnailUrl = resolveExternalUrl(
    item.thumbnailUrl ??
    rawMetadata.thumbnailUrl ??
    rawMetadata.image ??
    rawMetadata.ogImage,
    item.url
  );
  const fingerprint = createFingerprint([
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
    thumbnailUrl,
    fingerprint,
    externalId: item.externalId,
    qualityScore: item.qualityScore ?? source.trustScore ?? 0.5,
    tags: uniqueTags([...(source.tags ?? []), ...(item.tags ?? [])])
  };
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
