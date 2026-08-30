import { asArray } from "../pipeline/utils.mjs";
import { collectArxiv } from "./arxiv.mjs";
import { collectGitHub } from "./github.mjs";
import { collectRss } from "./rss.mjs";
import { collectWeb } from "./web.mjs";

const adapters = new Map([
  ["github", collectGitHub],
  ["github-search", collectGitHub],
  ["arxiv", collectArxiv],
  ["rss", collectRss],
  ["rss-or-api", collectRss],
  ["model-release", collectRss],
  ["web", collectWeb],
  ["html", collectWeb]
]);

export function registerSourceAdapter(type, adapter) {
  adapters.set(type, adapter);
}

export async function collectSource(source, limit, context = {}) {
  const adapter = adapters.get(source.type);

  if (!adapter) {
    throw new Error(`unsupported source type: ${source.type}`);
  }

  return adapter(source, limit, {
    asArray,
    userAgent: context.userAgent
  });
}
