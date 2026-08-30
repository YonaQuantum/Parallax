import { KnowledgeDomain, KnowledgeInterference } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/server/db/prisma";

export const dynamic = "force-dynamic";

const querySchema = z.object({
  deep: z
    .preprocess((value) => value === "1" || value === "true", z.boolean())
    .default(false),
  take: z.coerce.number().int().positive().max(100).default(36)
});

export async function GET(request: Request) {
  const parsed = querySchema.safeParse(Object.fromEntries(new URL(request.url).searchParams));

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid query" }, { status: 400 });
  }

  const artifactWhere = parsed.data.deep
    ? {}
    : {
        interference: {
          not: KnowledgeInterference.BLOCKED
        },
        deepArchivedAt: null
      };
  const [artifacts, signals, clocks, domainHeat] = await Promise.all([
    prisma.ingestedArtifact.findMany({
      where: artifactWhere,
      orderBy: [{ createdAt: "desc" }, { heat: "desc" }],
      take: parsed.data.take,
      select: {
        id: true,
        title: true,
        url: true,
        domain: true,
        interference: true,
        heat: true,
        metadata: true,
        createdAt: true,
        freshnessUntil: true,
        source: {
          select: {
            title: true,
            sourceType: true
          }
        },
        agent: {
          select: {
            slug: true,
            name: true
          }
        },
        skeletons: {
          select: {
            kind: true,
            payload: true
          },
          take: 3
        }
      }
    }),
    prisma.agentSignal.findMany({
      where: {
        acknowledgedAt: null,
        OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }]
      },
      orderBy: [{ severity: "desc" }, { createdAt: "desc" }],
      take: 12,
      select: {
        id: true,
        severity: true,
        title: true,
        body: true,
        createdAt: true
      }
    }),
    prisma.domainClock.findMany({
      where: {
        enabled: true
      },
      orderBy: [{ domain: "asc" }],
      select: {
        domain: true,
        heartbeatSeconds: true,
        lastTickAt: true,
        nextTickAt: true
      }
    }),
    prisma.ingestedArtifact.groupBy({
      by: ["domain"],
      where: artifactWhere,
      _avg: {
        heat: true
      },
      _count: {
        _all: true
      }
    })
  ]);

  return NextResponse.json({
    artifacts: artifacts.map((artifact) => ({
      id: artifact.id,
      title: artifact.title,
      url: artifact.url,
      summary: readSignalSummary(asRecord(artifact.metadata), artifact.domain),
      thumbnailUrl: readUrl(asRecord(artifact.metadata), "thumbnailUrl"),
      source: readString(asRecord(artifact.metadata), "sourceName") ??
        artifact.source?.title ??
        artifact.source?.sourceType ??
        null,
      domain: artifact.domain,
      interference: artifact.interference,
      heat: artifact.heat,
      createdAt: artifact.createdAt,
      freshnessUntil: artifact.freshnessUntil,
      radar: artifact.agent,
      skeletons: artifact.skeletons
    })),
    signals,
    clocks,
    heatmap: domainHeat.map((domain) => ({
      domain: domain.domain,
      heat: Number((domain._avg.heat ?? 0).toFixed(4)),
      count: domain._count._all
    }))
  });
}

function asRecord(value: unknown) {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }

  return null;
}

function readSignalSummary(record: Record<string, unknown> | null, domain: KnowledgeDomain) {
  const summary = readString(record, "summary");
  const whyItMatters = readString(record, "whyItMatters") ?? readString(record, "whyInteresting");

  if (summary && isReadableSummary(summary)) {
    return summary;
  }

  return (whyItMatters && isReadableSummary(whyItMatters))
    ? whyItMatters
    : domainFallbackSummary[domain] ?? summary;
}

function isReadableSummary(value: string) {
  return /[\u4e00-\u9fff]/.test(value) && !/进\s*入\s*视\s*野/.test(value);
}

const domainFallbackSummary: Record<KnowledgeDomain, string> = {
  CODE: "先看工具链价值：可运行性、维护状态、文档和社区采用。",
  AI_MODELS: "先看真实能力：模型来源、评测证据、许可和本地可复用性。",
  GAME_INTERACTION: "先看可玩性：机制、原型成本和能否转成工作室实验。",
  HARDWARE_EMBEDDED: "先看可复现性：物料、成本、安全性和工程约束。",
  CREATIVE_MEDIA: "先看表达空间：工具链、声音/图形流程和作品转化。",
  SCIENCE_COSMOS: "先看证据：来源、观测边界，以及它能打开的问题。",
  GENERAL: "保留为线索，等待更多来源交叉验证。"
};

function readString(record: Record<string, unknown> | null, key: string) {
  const value = record?.[key];
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function readUrl(record: Record<string, unknown> | null, key: string) {
  const value = readString(record, key);
  if (!value) {
    return null;
  }

  try {
    const url = new URL(value);
    return ["http:", "https:"].includes(url.protocol) ? url.toString() : null;
  } catch {
    return null;
  }
}
