import {
  AgentSignalSeverity,
  KnowledgeDomain,
  KnowledgeInterference,
  type Prisma
} from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";
import {
  classifyDomain,
  computeHeat,
  deriveSkeletons,
  digestText,
  scoreInterference,
  splitKnowledgeStreams
} from "@/server/radar/prism";
import { upsertRadarResident } from "@/server/radar/residents";
import { requireRadarAccess } from "@/server/radar/security";
import { prisma } from "@/server/db/prisma";
import { createTagSlug, normalizeTagNames } from "@/server/tags";

export const dynamic = "force-dynamic";

const sourceSchema = z.object({
  url: z.string().url().optional(),
  title: z.string().max(300).optional(),
  type: z.string().max(80).default("web"),
  trustScore: z.number().finite().min(0).max(1).default(0.5)
});

const ingestSchema = z.object({
  slug: z.string().min(1),
  source: sourceSchema.optional(),
  title: z.string().min(1).max(300),
  url: z.string().url().optional(),
  externalId: z.string().max(300).optional(),
  rawText: z.string().min(1).max(500_000),
  domain: z.nativeEnum(KnowledgeDomain).optional(),
  tags: z.array(z.string().min(1).max(80)).max(24).optional(),
  qualityScore: z.number().finite().min(0).max(1).default(0.5),
  metadata: z.unknown().optional()
});

export async function POST(request: Request) {
  const denied = requireRadarAccess(request);

  if (denied) {
    return denied;
  }

  const parsed = ingestSchema.safeParse(await request.json());

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid artifact" }, { status: 400 });
  }

  const radar = await upsertRadarResident({
    slug: parsed.data.slug
  });
  const domain = parsed.data.domain ?? classifyDomain(`${parsed.data.title}\n${parsed.data.rawText}`);
  const interference = scoreInterference(parsed.data.rawText, parsed.data.qualityScore);
  const heat =
    interference === KnowledgeInterference.BLOCKED
      ? 0
      : computeHeat(parsed.data.qualityScore);
  const freshnessUntil =
    heat >= 0.72 ? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) : null;
  const deepArchivedAt =
    interference === KnowledgeInterference.BLOCKED || parsed.data.qualityScore < 0.25
      ? new Date()
      : null;
  const sourceUrl = parsed.data.source?.url ?? parsed.data.url;
  const source = sourceUrl
    ? await prisma.knowledgeSource.upsert({
        where: { url: sourceUrl },
        update: {
          title: parsed.data.source?.title ?? parsed.data.title,
          sourceType: parsed.data.source?.type ?? "web",
          domain,
          trustScore: parsed.data.source?.trustScore ?? 0.5,
          interference,
          lastFetchedAt: new Date()
        },
        create: {
          url: sourceUrl,
          title: parsed.data.source?.title ?? parsed.data.title,
          sourceType: parsed.data.source?.type ?? "web",
          domain,
          trustScore: parsed.data.source?.trustScore ?? 0.5,
          interference,
          lastFetchedAt: new Date()
        }
      })
    : null;

  const streams = splitKnowledgeStreams(parsed.data.rawText);
  const skeletons = deriveSkeletons(parsed.data.rawText);
  const tagNames = normalizeTagNames([
    domainTagName[domain],
    ...(parsed.data.tags ?? [])
  ]);
  const artifactData = {
    title: parsed.data.title,
    url: parsed.data.url ?? sourceUrl,
    externalId: parsed.data.externalId,
    domain,
    interference,
    qualityScore: parsed.data.qualityScore,
    heat,
    rawDigest: digestText(parsed.data.rawText),
    metadata: parsed.data.metadata as Prisma.InputJsonValue,
    freshnessUntil,
    deepArchivedAt
  };
  const streamData = streams.map((stream) => ({
    kind: stream.kind,
    content: stream.content,
    weight: stream.weight,
    tokens: estimateTokens(stream.content)
  }));
  const skeletonData = skeletons.map((skeleton) => ({
    kind: skeleton.kind,
    payload: skeleton.payload
  }));
  const tagData = tagNames.map((name) => ({
    tag: {
      connectOrCreate: {
        where: { slug: createTagSlug(name) },
        create: {
          slug: createTagSlug(name),
          name
        }
      }
    }
  }));
  const existingArtifact = parsed.data.externalId
    ? await prisma.ingestedArtifact.findFirst({
        where: {
          agentId: radar.id,
          externalId: parsed.data.externalId
        },
        select: {
          id: true
        }
      })
    : null;
  const artifact = existingArtifact
    ? await prisma.ingestedArtifact.update({
        where: {
          id: existingArtifact.id
        },
        data: {
          ...artifactData,
          agent: {
            connect: { id: radar.id }
          },
          source: source
            ? {
                connect: { id: source.id }
              }
            : {
                disconnect: true
              },
          streams: {
            deleteMany: {},
            create: streamData
          },
          skeletons: {
            deleteMany: {},
            create: skeletonData
          },
          tags: {
            deleteMany: {},
            create: tagData
          }
        },
        include: {
          streams: {
            select: {
              kind: true
            }
          },
          skeletons: {
            select: {
              kind: true
            }
          },
          tags: {
            select: {
              tag: {
                select: {
                  name: true
                }
              }
            }
          }
        }
      })
    : await prisma.ingestedArtifact.create({
        data: {
          ...artifactData,
          agent: {
            connect: { id: radar.id }
          },
          source: source
            ? {
                connect: { id: source.id }
              }
            : undefined,
          streams: {
            create: streamData
          },
          skeletons: {
            create: skeletonData
          },
          tags: {
            create: tagData
          }
        },
        include: {
          streams: {
            select: {
              kind: true
            }
          },
          skeletons: {
            select: {
              kind: true
            }
          },
          tags: {
            select: {
              tag: {
                select: {
                  name: true
                }
              }
            }
          }
        }
      });

  if (!existingArtifact && (interference !== KnowledgeInterference.CLEAR || heat >= 0.78)) {
    await prisma.agentSignal.create({
      data: {
        agentId: radar.id,
        severity:
          interference === KnowledgeInterference.BLOCKED
            ? AgentSignalSeverity.WARNING
            : heat >= 0.78
              ? AgentSignalSeverity.NOTICE
              : AgentSignalSeverity.INFO,
        title:
          interference === KnowledgeInterference.CLEAR
            ? "新知热度上升"
            : "灰色干扰波已标记",
        body: artifact.title,
        payload: {
          artifactId: artifact.id,
          domain,
          interference,
          heat
        }
      }
    });
  }

  return NextResponse.json({
    artifact: {
      id: artifact.id,
      title: artifact.title,
      domain: artifact.domain,
      interference: artifact.interference,
      heat: artifact.heat,
      streamCount: artifact.streams.length,
      skeletonCount: artifact.skeletons.length,
      tags: artifact.tags.map((item) => item.tag.name)
    }
  });
}

function estimateTokens(content: string) {
  return Math.ceil(content.length / 4);
}

const domainTagName: Record<KnowledgeDomain, string> = {
  CODE: "编程与开源",
  AI_MODELS: "AI 与模型",
  GAME_INTERACTION: "游戏与交互",
  HARDWARE_EMBEDDED: "硬件与嵌入式",
  CREATIVE_MEDIA: "创作与媒体",
  SCIENCE_COSMOS: "科学与宇宙",
  GENERAL: "通用"
};
