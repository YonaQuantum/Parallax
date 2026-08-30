import { z } from "zod";

export function createTagSlug(name: string) {
  const parsed = z.string().trim().min(1).parse(name);
  const slug = parsed
    .toLowerCase()
    .replace(/['"]/g, "")
    .replace(/[^a-z0-9\u4e00-\u9fa5]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return slug || `tag-${Date.now().toString(36)}`;
}

export function normalizeTagNames(tags: string[], limit = 12) {
  const seen = new Set<string>();
  const normalized: string[] = [];

  for (const tag of tags) {
    const name = tag.trim();

    if (!name || seen.has(name.toLowerCase())) {
      continue;
    }

    seen.add(name.toLowerCase());
    normalized.push(name.slice(0, 40));

    if (normalized.length >= limit) {
      break;
    }
  }

  return normalized;
}
