import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { describe, it } from "node:test";
import { eventRelationFallback, exactDedupe } from "../dedupe/index.mjs";
import { extractReadableText } from "../fetch/content.mjs";
import {
  buildSignalCandidate,
  prepareRadarItems,
  toIngestPayload
} from "../pipeline/candidate.mjs";
import { runOfflinePipeline } from "../pipeline/offline.mjs";
import {
  canonicalizeUrl,
  createFingerprint
} from "../pipeline/utils.mjs";
import { rankCandidate } from "../rank/index.mjs";
import { validateEventRelation, validateSignalCandidate } from "../schemas/index.mjs";

const sources = [
  {
    id: "github-fixture",
    title: "GitHub",
    type: "github-search",
    domain: "CODE",
    tags: ["GitHub", "开源项目"],
    trustScore: 0.82
  },
  {
    id: "ai-fixture",
    title: "arXiv",
    type: "arxiv",
    domain: "AI_MODELS",
    tags: ["arXiv", "论文"],
    trustScore: 0.82
  },
  {
    id: "game-fixture",
    title: "Game Tools",
    type: "rss",
    domain: "GAME_INTERACTION",
    tags: ["游戏与交互"],
    trustScore: 0.72
  },
  {
    id: "hardware-fixture",
    title: "Hardware",
    type: "rss",
    domain: "HARDWARE_EMBEDDED",
    tags: ["硬件"],
    trustScore: 0.7
  },
  {
    id: "creative-fixture",
    title: "Creative Media",
    type: "rss",
    domain: "CREATIVE_MEDIA",
    tags: ["创作与媒体"],
    trustScore: 0.68
  },
  {
    id: "science-fixture",
    title: "Science",
    type: "rss",
    domain: "SCIENCE_COSMOS",
    tags: ["科学与宇宙"],
    trustScore: 0.76
  }
];

describe("Radar pipeline primitives", () => {
  it("normalizes URLs for exact dedupe", () => {
    assert.equal(
      canonicalizeUrl("https://EXAMPLE.com/path/?utm_source=x&ref=feed#section"),
      "https://example.com/path"
    );
  });

  it("creates stable content fingerprints", () => {
    const first = createFingerprint(["title", "content"]);
    const second = createFingerprint(["title", "content"]);
    const third = createFingerprint(["title", "other"]);

    assert.equal(first, second);
    assert.notEqual(first, third);
  });

  it("dedupes by source GUID, canonical URL, and fingerprint", () => {
    const source = sources[0];
    const items = prepareRadarItems(source, [
      {
        externalId: "github:example/tool",
        title: "example/tool",
        url: "https://github.com/example/tool?utm_campaign=x",
        rawText: "same body",
        metadata: {}
      },
      {
        externalId: "github:example/tool",
        title: "example/tool",
        url: "https://github.com/example/tool",
        rawText: "same body",
        metadata: {}
      },
      {
        externalId: "github:example/other",
        title: "example/tool",
        url: "https://mirror.example/tool",
        rawText: "same body",
        metadata: {}
      }
    ]);

    assert.equal(items.length, 1);
    assert.equal(exactDedupe(items).length, 1);
  });

  it("ranks with configurable hybrid weights", () => {
    const source = sources[0];
    const item = {
      title: "high momentum repo",
      excerpt: "",
      publishedAt: new Date().toISOString(),
      metrics: { stars: 20000, starsDelta24h: 2000 }
    };
    const candidate = {
      novelty: 0.7,
      editorialInterest: 0.7,
      topics: ["GitHub", "Rust"]
    };
    const ranked = rankCandidate(
      {
        rankingWeights: {
          recency: 0,
          momentum: 1,
          sourceQuality: 0,
          novelty: 0,
          communityFit: 0,
          editorialInterest: 0
        }
      },
      source,
      item,
      candidate
    );

    assert.equal(ranked.scoreWeights.momentum, 1);
    assert.ok(ranked.signalScore > 0.4);
  });

  it("validates LLM structured output", () => {
    const valid = validateSignalCandidate({
      primaryCategory: "ai",
      topics: ["Agent", "RAG"],
      summary: "一项模型工具更新发布，聚焦本地检索增强流程。",
      whyItMatters: "它可能影响社区的本地知识流建设。",
      novelty: 0.7,
      editorialInterest: 0.66,
      confidence: 0.8,
      evidence: ["title"],
      flags: ["none"]
    });
    const invalid = validateSignalCandidate({
      primaryCategory: "marketing",
      topics: ["Agent"],
      summary: "bad",
      whyItMatters: "bad",
      novelty: 0.5,
      editorialInterest: 0.5,
      confidence: 0.5
    });

    assert.equal(valid.ok, true);
    assert.equal(valid.value.primaryCategory, "ai");
    assert.equal(invalid.ok, false);
  });

  it("falls back when LLM is disabled", async () => {
    const source = sources[1];
    const [item] = prepareRadarItems(source, [
      {
        externalId: "arxiv:test",
        title: "A local agent evaluation paper",
        url: "https://arxiv.org/abs/test",
        summary: "The paper evaluates local agents.",
        rawText: "The paper evaluates local agents.",
        metadata: {}
      }
    ]);
    const candidate = await buildSignalCandidate({}, source, item, null);

    assert.equal(candidate.primaryCategory, "ai");
    assert.equal(candidate.confidence, 0.45);
  });

  it("continues when LLM enrichment errors", async () => {
    const source = sources[2];
    const [item] = prepareRadarItems(source, [
      {
        externalId: "game:test",
        title: "Realtime interaction prototype",
        url: "https://example.org/game",
        summary: "A realtime game interaction prototype.",
        rawText: "A realtime game interaction prototype.",
        metadata: {}
      }
    ]);
    const candidate = await buildSignalCandidate({}, source, item, {
      enrich: async () => {
        throw new Error("timeout");
      }
    });

    assert.equal(candidate.primaryCategory, "game");
    assert.ok(candidate.signalScore > 0);
  });

  it("publishes provenance and compatibility metadata", async () => {
    const source = sources[5];
    const [item] = prepareRadarItems(source, [
      {
        externalId: "science:test",
        title: "Exoplanet signal",
        url: "https://example.org/exoplanet?utm_source=feed",
        summary: "A science source updates exoplanet observations.",
        rawText: "A science source updates exoplanet observations.",
        metadata: {
          published: "2026-08-31T00:00:00.000Z"
        }
      }
    ]);
    const candidate = await buildSignalCandidate({}, source, item, null);
    const payload = toIngestPayload("offline-radar", source, item, candidate);

    assert.equal(payload.metadata.signalCandidate.primaryCategory, "science");
    assert.equal(payload.metadata.whyInteresting, payload.metadata.whyItMatters);
    assert.equal(payload.metadata.canonicalUrl, "https://example.org/exoplanet");
    assert.ok(payload.metadata.fingerprint);
  });

  it("keeps same-event relation as a bounded fuzzy step", () => {
    const relation = eventRelationFallback(
      { externalId: "same", canonicalUrl: "https://example.org/a", fingerprint: "a" },
      { externalId: "same", canonicalUrl: "https://example.org/b", fingerprint: "b" }
    );
    const valid = validateEventRelation(relation);

    assert.equal(valid.ok, true);
    assert.equal(valid.value.relationship, "SAME_EVENT");
  });

  it("extracts readable web content without sending raw HTML to LLM", () => {
    const text = extractReadableText(`
      <html>
        <head><title>Signal</title><style>.x{}</style></head>
        <body><script>alert(1)</script><article><h1>Readable</h1><p>Clean text.</p></article></body>
      </html>
    `);

    assert.match(text, /Signal/);
    assert.match(text, /Readable/);
    assert.doesNotMatch(text, /alert/);
  });
});

describe("offline fixture", () => {
  it("turns 10 raw items into 3 ranked signals without network or LLM", async () => {
    const rawItems = JSON.parse(
      await readFile(new URL("./fixtures/raw-items.json", import.meta.url), "utf8")
    );
    const signals = await runOfflinePipeline(rawItems, {
      sources,
      limit: 3
    });

    assert.equal(rawItems.length, 10);
    assert.equal(signals.length, 3);
    assert.deepEqual(
      signals.map((signal) => signal.candidate.duplicateOf),
      [undefined, undefined, undefined]
    );
    assert.ok(signals[0].candidate.signalScore >= signals[2].candidate.signalScore);
  });
});
