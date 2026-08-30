export function createSlug(title: string) {
  const asciiSlug = title
    .toLowerCase()
    .trim()
    .replace(/['"]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return asciiSlug || `post-${Date.now().toString(36)}`;
}

export async function createUniqueSlug(
  title: string,
  exists: (slug: string) => Promise<boolean>
) {
  const base = createSlug(title);
  let slug = base;
  let index = 2;

  while (await exists(slug)) {
    slug = `${base}-${index}`;
    index += 1;
  }

  return slug;
}
