import { clampNumber } from "../pipeline/utils.mjs";

export const DEFAULT_RANKING_WEIGHTS = {
  recency: 0.25,
  momentum: 0.2,
  sourceQuality: 0.15,
  novelty: 0.15,
  communityFit: 0.15,
  editorialInterest: 0.1
};

export function rankCandidate(config, source, item, candidate) {
  const score = {
    recency: freshnessScore(item.publishedAt),
    momentum: momentumScore(item.metrics),
    sourceQuality: source.trustScore ?? item.qualityScore ?? 0.5,
    novelty: candidate.novelty,
    communityFit: communityFitScore(source.domain, candidate.topics, item),
    editorialInterest: candidate.editorialInterest
  };
  const weights = config.rankingWeights ?? config.rank?.weights ?? DEFAULT_RANKING_WEIGHTS;
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

export function freshnessScore(publishedAt) {
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

export function momentumScore(metrics) {
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

export function communityFitScore(domain, topics, item) {
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
