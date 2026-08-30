import { clampText, compactText, stripHtml } from "../pipeline/utils.mjs";
import { fetchText } from "../sources/http.mjs";

const DEFAULT_CONTENT_LIMIT = 6000;

export async function fetchContentForItem(source, item, context = {}) {
  const shouldFetch =
    source.fetchContent === true ||
    source.type === "web" ||
    (!item.content && !item.rawText && Boolean(item.url));

  if (!shouldFetch || !item.url) {
    return item;
  }

  try {
    const html = await fetchText(new URL(item.url), context.userAgent);
    const extracted = extractReadableText(html, source.contentLimit ?? DEFAULT_CONTENT_LIMIT);

    if (!extracted) {
      return item;
    }

    return {
      ...item,
      content: extracted,
      rawMetadata: {
        ...item.rawMetadata,
        contentFetchedAt: new Date().toISOString(),
        contentFetched: true
      }
    };
  } catch (error) {
    return {
      ...item,
      rawMetadata: {
        ...item.rawMetadata,
        contentFetchError: error.message,
        contentFetched: false
      }
    };
  }
}

export function extractReadableText(html, limit = DEFAULT_CONTENT_LIMIT) {
  const withoutScripts = String(html ?? "")
    .replace(/<script\b[\s\S]*?<\/script>/gi, " ")
    .replace(/<style\b[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript\b[\s\S]*?<\/noscript>/gi, " ");
  const title = textOfTag(withoutScripts, "title");
  const main = textOfTag(withoutScripts, "article") || textOfTag(withoutScripts, "main");
  const body = main || textOfTag(withoutScripts, "body") || withoutScripts;
  return clampText(compactText([title, stripHtml(body)].filter(Boolean).join("\n")), limit);
}

function textOfTag(html, tag) {
  const match = html.match(new RegExp(`<${tag}\\b[^>]*>([\\s\\S]*?)</${tag}>`, "i"));
  return match?.[1] ?? "";
}
