import { buildSignalCandidate, prepareRadarItems } from "./candidate.mjs";

export async function runOfflinePipeline(rawItems, options = {}) {
  const config = {
    slug: "offline-radar",
    rankingWeights: options.rankingWeights,
    rank: options.rank
  };
  const sourceById = new Map(options.sources?.map((source) => [source.id, source]) ?? []);
  const grouped = groupBySource(rawItems, sourceById);
  const seenItems = [];
  const candidates = [];

  for (const { source, items } of grouped) {
    for (const item of prepareRadarItems(source, items)) {
      const candidate = await buildSignalCandidate(config, source, item, options.llm ?? null, seenItems);
      seenItems.push(item);

      if (!candidate.duplicateOf) {
        candidates.push({ source, item, candidate });
      }
    }
  }

  return candidates
    .sort((a, b) => b.candidate.signalScore - a.candidate.signalScore)
    .slice(0, options.limit ?? 3);
}

function groupBySource(rawItems, sourceById) {
  const groups = new Map();

  for (const raw of rawItems) {
    const source =
      sourceById.get(raw.sourceId) ??
      raw.source ?? {
        id: raw.sourceId ?? "fixture-source",
        title: "Fixture",
        type: "rss",
        domain: raw.domain ?? "GENERAL",
        tags: raw.tags ?? [],
        trustScore: raw.trustScore ?? 0.5
      };

    if (!groups.has(source.id)) {
      groups.set(source.id, {
        source,
        items: []
      });
    }

    groups.get(source.id).items.push(raw.item ?? raw);
  }

  return [...groups.values()];
}
