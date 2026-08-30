import { compactText } from "../pipeline/utils.mjs";

export async function collectWeb(source, limit, context) {
  const urls = context.asArray(source.urls ?? source.url);

  return urls.slice(0, limit).map((url, index) => ({
    externalId: `web:${url}`,
    title: compactText(source.titles?.[index] ?? source.title ?? url),
    url,
    thumbnailUrl: source.thumbnailUrl,
    summary: "",
    rawText: "",
    qualityScore: source.trustScore ?? 0.5,
    metadata: {
      source: source.id
    },
    tags: source.tags ?? []
  }));
}
