import { clampText, compactText, decodeXml, escapeRegex, stripHtml } from "../pipeline/utils.mjs";
import { fetchText } from "./http.mjs";

export async function collectRss(source, limit, context) {
  const feeds = context.asArray(source.feeds ?? source.url);

  if (feeds.length === 0) {
    throw new Error("rss source has no feeds");
  }

  const items = [];

  for (const feedUrl of feeds) {
    const xml = await fetchText(new URL(feedUrl), context.userAgent);
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
