import { clampNumber, clampText, cleanHeaders, compactText, stripHtml } from "../pipeline/utils.mjs";

const HN_SEARCH_API = "https://hn.algolia.com/api/v1/search";

export async function collectHackerNews(source, limit, context) {
  const tags = context.asArray(source.queries ?? ["front_page"]);
  const items = [];

  for (const tag of tags) {
    const url = new URL(HN_SEARCH_API);
    url.searchParams.set("tags", tag);
    url.searchParams.set("hitsPerPage", String(Math.min(limit, 50)));

    const json = await fetchHn(url, context.userAgent);
    for (const hit of json.hits ?? []) {
      const title = compactText(hit.title ?? "");
      if (!title || !hit.objectID) {
        continue;
      }

      const points = toNumber(hit.points);
      const comments = toNumber(hit.num_comments);
      const storyText = stripHtml(hit.story_text ?? "");

      items.push({
        externalId: `hn:${hit.objectID}`,
        title,
        url: hit.url ?? `https://news.ycombinator.com/item?id=${hit.objectID}`,
        summary: clampText(storyText, 600),
        rawText: clampText(
          [title, storyText, `points: ${hit.points}`, `comments: ${hit.num_comments}`, `author: ${hit.author}`]
            .filter(Boolean)
            .join("\n"),
          3000
        ),
        qualityScore: 0.62,
        metadata: {
          source: source.id,
          published: hit.created_at,
          score: hnMomentum(points),
          comments,
          points,
          author: hit.author
        },
        tags: []
      });
    }
  }

  return uniqueByExternalId(items).slice(0, limit);
}

// front-page points usually span ~10–1000; log-scaled so 100 ≈ 0.66, 1000 ≈ 1.0.
function hnMomentum(points) {
  return clampNumber(Math.log10(points + 1) / 3, 0, 1, 0);
}

function toNumber(value) {
  return Number.isFinite(value) ? Number(value) : 0;
}

async function fetchHn(url, userAgent) {
  const response = await fetch(url, {
    headers: cleanHeaders({
      "user-agent": userAgent
    })
  });

  if (!response.ok) {
    throw new Error(`hn.algolia.com ${response.status}: ${await response.text()}`);
  }

  return response.json();
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
