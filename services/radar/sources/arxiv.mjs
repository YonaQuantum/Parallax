import { clampText, compactText, decodeXml, escapeRegex } from "../pipeline/utils.mjs";
import { fetchText } from "./http.mjs";

export async function collectArxiv(source, limit, context) {
  const queries = context.asArray(source.queries ?? source.query);
  const items = [];

  for (const query of queries) {
    const url = new URL("https://export.arxiv.org/api/query");
    url.searchParams.set("search_query", `all:${query}`);
    url.searchParams.set("sortBy", "submittedDate");
    url.searchParams.set("sortOrder", "descending");
    url.searchParams.set("max_results", String(Math.min(limit, 20)));

    const xml = await fetchText(url, context.userAgent);
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

function matchBlocks(xml, tag) {
  return [...xml.matchAll(new RegExp(`<${escapeRegex(tag)}\\b[^>]*>([\\s\\S]*?)</${escapeRegex(tag)}>`, "gi"))].map((match) => match[1]);
}

function textOf(xml, tag) {
  const match = xml.match(new RegExp(`<${escapeRegex(tag)}\\b[^>]*>([\\s\\S]*?)</${escapeRegex(tag)}>`, "i"));
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
