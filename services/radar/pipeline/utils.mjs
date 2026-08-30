import { createHash } from "node:crypto";

export function asArray(value) {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

export function canonicalizeUrl(value) {
  if (!value) {
    return "";
  }

  try {
    const url = new URL(value);
    url.hash = "";
    for (const key of [...url.searchParams.keys()]) {
      if (
        key.startsWith("utm_") ||
        ["fbclid", "gclid", "mc_cid", "mc_eid", "ref", "source"].includes(key)
      ) {
        url.searchParams.delete(key);
      }
    }
    url.hostname = url.hostname.toLowerCase();
    return url.toString().replace(/\/$/, "");
  } catch {
    return String(value).trim();
  }
}

export function normalizeTitle(value) {
  return compactText(value).toLowerCase().replace(/[^\p{Letter}\p{Number}]+/gu, " ").trim();
}

export function createFingerprint(parts) {
  return createHash("sha256")
    .update(parts.filter(Boolean).join("\n"))
    .digest("hex");
}

export function parseDate(value) {
  if (!value) {
    return undefined;
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
}

export function compactText(value) {
  return decodeXml(String(value ?? "")).replace(/\s+/g, " ").trim();
}

export function stripHtml(value) {
  return String(value ?? "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

export function decodeXml(value) {
  return String(value ?? "")
    .replaceAll("<![CDATA[", "")
    .replaceAll("]]>", "")
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/&#x([\da-f]+);/gi, (_, code) => String.fromCodePoint(Number.parseInt(code, 16)))
    .replaceAll("&amp;", "&")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&quot;", "\"")
    .replaceAll("&#39;", "'");
}

export function clampText(value, maxLength) {
  const text = String(value ?? "");
  if (text.length <= maxLength) {
    return text;
  }

  return `${text.slice(0, maxLength - 1).trim()}…`;
}

export function clampNumber(value, min, max, fallback) {
  const number = Number(value);
  if (!Number.isFinite(number)) {
    return fallback;
  }

  return Math.min(max, Math.max(min, number));
}

export function uniqueTags(tags, limit = 12) {
  const seen = new Set();
  return tags
    .filter((tag) => typeof tag === "string" && tag.trim())
    .map((tag) => tag.trim())
    .filter((tag) => {
      const key = tag.toLowerCase();
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    })
    .slice(0, limit);
}

export function cleanHeaders(headers) {
  return Object.fromEntries(Object.entries(headers).filter(([, value]) => value));
}

export function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function daysAgo(days) {
  const date = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  return date.toISOString().slice(0, 10);
}

export function detectLanguage(text) {
  const value = String(text ?? "");
  if (/[\u4e00-\u9fff]/.test(value) && /[a-z]/i.test(value)) return "mixed";
  if (/[\u4e00-\u9fff]/.test(value)) return "zh-CN";
  if (/[a-z]/i.test(value)) return "en";
  return "unknown";
}

export function parseBoolean(value, fallback) {
  if (typeof value === "boolean") {
    return value;
  }
  if (typeof value !== "string") {
    return fallback;
  }

  return ["1", "true", "yes", "on"].includes(value.toLowerCase());
}

export function readEnvFromName(name) {
  return name ? process.env[name] : undefined;
}
