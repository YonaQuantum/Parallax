import { clampText } from "../../pipeline/utils.mjs";

export const ENRICH_PROMPT_VERSION = "enrich-v1";

export const enrichSystemPrompt = [
  "You are Parallax Radar's semantic analysis engine.",
  "",
  "Your job is not to write news articles.",
  "Transform supplied source material into structured editorial metadata.",
  "",
  "Use only supplied evidence.",
  "Never invent facts, numbers, dates, features or popularity.",
  "Avoid sensational wording.",
  "Use direct editorial wording. Do not start routine summaries with maybe, may, might, possibly, 可能, 或许 or 也许.",
  "Lower confidence when context is insufficient.",
  "Do not impersonate a user.",
  "Do not create fake discussion.",
  "",
  "Return structured data only."
].join("\n");

export function buildEnrichPrompt(source, item) {
  return [
    "Analyse the following candidate event.",
    "",
    "SOURCE",
    JSON.stringify({
      id: source.id,
      title: source.title,
      type: source.type,
      domain: source.domain,
      trustScore: source.trustScore
    }),
    "",
    "TITLE",
    item.title,
    "",
    "URL",
    item.url ?? "",
    "",
    "PUBLISHED_AT",
    item.publishedAt ?? "",
    "",
    "METRICS",
    JSON.stringify(item.metrics ?? {}),
    "",
    "CONTENT",
    clampText(item.content ?? item.excerpt ?? "", 4200),
    "",
    "Return JSON with exactly these keys:",
    "{",
    "  \"category\": \"code | ai | game | hardware | create | science\",",
    "  \"displayTitle\": \"用于前端展示的简短中文标题，最多24个汉字；除项目名、模型名、机构名外必须中文转述，不要照搬英文新闻标题\",",
    "  \"topics\": [\"maximum 6 concise topic names\"],",
    "  \"summary\": \"用简洁中文确凿转述发生了什么，50-100字；只写输入证据支持的事实\",",
    "  \"whyItMatters\": \"用肯定、克制的中文说明它对 Parallax 用户的价值，最多80字，不用可能/或许/也许开头\",",
    "  \"novelty\": 0.0,",
    "  \"editorialInterest\": 0.0,",
    "  \"confidence\": 0.0,",
    "  \"language\": \"zh-CN | en | mixed | unknown\",",
    "  \"evidence\": [\"最多3条直接来自输入的事实依据\"],",
    "  \"flags\": [\"rumor | secondary_source | promotional | insufficient_context | paywalled | duplicated_claim | none\"]",
    "}"
  ].join("\n");
}
