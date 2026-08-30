import { daysAgo } from "../pipeline/utils.mjs";
import { fetchJson } from "./http.mjs";

export async function collectGitHub(source, limit, context) {
  const queries = context.asArray(source.queries ?? source.query);
  const items = [];

  for (const query of queries) {
    const resolvedQuery = query.replaceAll("YYYY-MM-DD", daysAgo(30));
    const url = new URL("https://api.github.com/search/repositories");
    url.searchParams.set("q", resolvedQuery);
    url.searchParams.set("sort", "stars");
    url.searchParams.set("order", "desc");
    url.searchParams.set("per_page", String(Math.min(limit, 20)));

    const json = await fetchJson(url, source.githubToken, context.userAgent);
    for (const repo of json.items ?? []) {
      items.push({
        externalId: `github:${repo.full_name}`,
        title: repo.full_name,
        url: repo.html_url,
        thumbnailUrl: repo.owner?.avatar_url,
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
          topics: repo.topics ?? [],
          updated: repo.updated_at,
          thumbnailUrl: repo.owner?.avatar_url
        },
        tags: [repo.language, ...(repo.topics ?? [])].filter(Boolean)
      });
    }
  }

  return uniqueByExternalId(items).slice(0, limit);
}

function scoreGitHubRepo(repo) {
  const stars = Math.max(0, repo.stargazers_count ?? 0);
  const starScore = Math.min(0.32, Math.log10(stars + 1) / 14);
  const freshnessScore = Date.now() - new Date(repo.updated_at).getTime() < 14 * 24 * 60 * 60 * 1000 ? 0.08 : 0;
  return Math.min(0.92, 0.54 + starScore + freshnessScore);
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
