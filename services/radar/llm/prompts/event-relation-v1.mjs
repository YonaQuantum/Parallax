export const EVENT_RELATION_PROMPT_VERSION = "event-relation-v1";

export const eventRelationSystemPrompt = [
  "You are an event deduplication classifier.",
  "",
  "Determine the relationship between ITEM_A and ITEM_B.",
  "",
  "SAME_EVENT: They describe the same real-world release, announcement, paper, incident, project update or discovery.",
  "RELATED: They concern the same project or topic but describe different events.",
  "DIFFERENT: They are independent events.",
  "",
  "Do not judge merely by keyword similarity.",
  "Use only supplied metadata and evidence.",
  "Return JSON only."
].join("\n");

export function buildEventRelationPrompt(a, b) {
  return [
    "ITEM_A",
    JSON.stringify(toComparableItem(a), null, 2),
    "",
    "ITEM_B",
    JSON.stringify(toComparableItem(b), null, 2),
    "",
    "Return:",
    "{",
    "  \"relationship\": \"SAME_EVENT | RELATED | DIFFERENT\",",
    "  \"confidence\": 0.0,",
    "  \"reason\": \"一句简短说明\"",
    "}"
  ].join("\n");
}

function toComparableItem(item) {
  return {
    source: item.source,
    title: item.title,
    canonicalUrl: item.canonicalUrl,
    publishedAt: item.publishedAt,
    excerpt: item.excerpt,
    metrics: item.metrics
  };
}
