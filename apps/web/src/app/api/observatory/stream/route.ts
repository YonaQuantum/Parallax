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

  if (summary && /[\u4e00-\u9fff]/.test(summary)) {
    return summary;
  }

  return whyItMatters ?? domainFallbackSummary[domain] ?? summary;
}

const domainFallbackSummary: Record<KnowledgeDomain, string> = {
  CODE: "一个外部开源或工程信号进入视野，适合继续评估其工具链价值。",
  AI_MODELS: "一个 AI 或模型相关信号进入视野，适合继续判断其真实能力与可复用性。",
  GAME_INTERACTION: "一个游戏与交互方向的信号进入视野，适合观察其原型和工具链潜力。",
  HARDWARE_EMBEDDED: "一个硬件或嵌入式方向的信号进入视野，适合评估可复现性与实践价值。",
  CREATIVE_MEDIA: "一个创作与媒体方向的信号进入视野，适合观察其工作流和表达潜力。",
  SCIENCE_COSMOS: "一个科学与宇宙方向的信号进入视野，适合继续追踪其证据和想象力价值。",
  GENERAL: "一个外部信号进入视野，适合继续判断是否值得社区讨论。"
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
