const categories = new Set(["code", "ai", "game", "hardware", "create", "science"]);
const relationKinds = new Set(["SAME_EVENT", "RELATED", "DIFFERENT"]);

export function validateSignalCandidate(input) {
  if (!input || typeof input !== "object") {
    return { ok: false, error: "candidate is not an object" };
  }

  const primaryCategory = input.primaryCategory ?? input.category;
  const candidate = {
    primaryCategory: categories.has(primaryCategory) ? primaryCategory : undefined,
    topics: normalizeStringArray(input.topics, 6),
    summary: normalizeText(input.summary, 140),
    whyItMatters: normalizeText(input.whyItMatters ?? input.why_it_matters, 120),
    novelty: normalizeScore(input.novelty),
    editorialInterest: normalizeScore(input.editorialInterest ?? input.editorial_interest),
    confidence: normalizeScore(input.confidence),
    language: normalizeText(input.language, 24) || "unknown",
    evidence: normalizeStringArray(input.evidence, 3, 160),
    flags: normalizeStringArray(input.flags, 6, 40),
    duplicateOf: typeof input.duplicateOf === "string" ? input.duplicateOf : undefined
  };

  const missing = [];
  if (!candidate.primaryCategory) missing.push("primaryCategory");
  if (candidate.topics.length === 0) missing.push("topics");
  if (!candidate.summary) missing.push("summary");
  if (!candidate.whyItMatters) missing.push("whyItMatters");
  if (candidate.novelty === undefined) missing.push("novelty");
  if (candidate.editorialInterest === undefined) missing.push("editorialInterest");
  if (candidate.confidence === undefined) missing.push("confidence");

  if (missing.length > 0) {
    return { ok: false, error: `candidate missing fields: ${missing.join(", ")}` };
  }

  return {
    ok: true,
    value: {
      ...candidate,
      category: candidate.primaryCategory,
      novelty: candidate.novelty,
      editorialInterest: candidate.editorialInterest,
      confidence: candidate.confidence,
      flags: candidate.flags.length ? candidate.flags : ["none"]
    }
  };
}

export function validateEventRelation(input) {
  if (!input || typeof input !== "object") {
    return { ok: false, error: "event relation is not an object" };
  }

  const relationship = relationKinds.has(input.relationship) ? input.relationship : undefined;
  const confidence = normalizeScore(input.confidence);
  const reason = normalizeText(input.reason, 160);

  if (!relationship || confidence === undefined || !reason) {
    return { ok: false, error: "event relation missing relationship, confidence, or reason" };
  }

  return {
    ok: true,
    value: {
      relationship,
      confidence,
      reason
    }
  };
}

function normalizeStringArray(value, limit, textLimit = 80) {
  if (!Array.isArray(value)) {
    return [];
  }

  const seen = new Set();
  return value
    .filter((item) => typeof item === "string" && item.trim())
    .map((item) => normalizeText(item, textLimit))
    .filter((item) => {
      const key = item.toLowerCase();
      if (!item || seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    })
    .slice(0, limit);
}

function normalizeText(value, limit) {
  if (typeof value !== "string") {
    return "";
  }

  const text = value.replace(/\s+/g, " ").trim();
  if (text.length <= limit) {
    return text;
  }
  return `${text.slice(0, limit - 1).trim()}…`;
}

function normalizeScore(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) {
    return undefined;
  }
  return Math.min(1, Math.max(0, number));
}
