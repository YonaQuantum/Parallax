export function exactDedupe(items) {
  const seen = new Set();
  return items.filter((item) => {
    const keys = [
      item.externalId && `external:${item.externalId}`,
      item.canonicalUrl && `url:${item.canonicalUrl}`,
      `fingerprint:${item.fingerprint}`
    ].filter(Boolean);
    const duplicate = keys.some((key) => seen.has(key));

    keys.forEach((key) => seen.add(key));
    return !duplicate;
  });
}

export function eventRelationFallback(a, b) {
  if (a.externalId && a.externalId === b.externalId) {
    return { relationship: "SAME_EVENT", confidence: 1, reason: "same externalId" };
  }

  if (a.canonicalUrl && a.canonicalUrl === b.canonicalUrl) {
    return { relationship: "SAME_EVENT", confidence: 0.98, reason: "same canonical URL" };
  }

  if (a.fingerprint && a.fingerprint === b.fingerprint) {
    return { relationship: "SAME_EVENT", confidence: 0.95, reason: "same content fingerprint" };
  }

  return { relationship: "DIFFERENT", confidence: 0.55, reason: "no exact duplicate keys matched" };
}
