import { KnowledgeInterference } from "@prisma/client";
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
      orderBy: [{ heat: "desc" }, { createdAt: "desc" }],
      take: parsed.data.take,
      select: {
        id: true,
        title: true,
        url: true,
        domain: true,
        interference: true,
        heat: true,
        createdAt: true,
        freshnessUntil: true,
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
