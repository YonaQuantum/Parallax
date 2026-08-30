import { MemoryLayer, type Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";
import { findRadarBySlug, upsertRadarResident } from "@/server/radar/residents";
import { requireRadarAccess } from "@/server/radar/security";
import { prisma } from "@/server/db/prisma";

export const dynamic = "force-dynamic";

const querySchema = z.object({
  slug: z.string().min(1),
  key: z.string().min(1).optional()
});

const memorySchema = z.object({
  slug: z.string().min(1),
  key: z.string().min(1),
  focus: z.unknown(),
  summary: z.string().max(8000).optional(),
  layer: z.nativeEnum(MemoryLayer).optional(),
  attentionScore: z.number().finite().min(0).max(1).optional(),
  ttlSeconds: z.number().int().positive().max(60 * 60 * 24 * 365).optional()
});

export async function GET(request: Request) {
  const denied = requireRadarAccess(request);

  if (denied) {
    return denied;
  }

  const parsed = querySchema.safeParse(Object.fromEntries(new URL(request.url).searchParams));

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid query" }, { status: 400 });
  }

  const radar = await findRadarBySlug(parsed.data.slug);

  if (!radar) {
    return NextResponse.json({ memories: [] });
  }

  const memories = await prisma.agentMemory.findMany({
    where: {
      agentId: radar.id,
      ...(parsed.data.key ? { key: parsed.data.key } : {}),
      OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }]
    },
    orderBy: [{ layer: "asc" }, { lastActivatedAt: "desc" }],
    take: parsed.data.key ? 1 : 50
  });

  return NextResponse.json({
    memories: memories.map(toRadarMemory)
  });
}

export async function POST(request: Request) {
  const denied = requireRadarAccess(request);

  if (denied) {
    return denied;
  }

  const parsed = memorySchema.safeParse(await request.json());

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid memory" }, { status: 400 });
  }

  const attentionScore = parsed.data.attentionScore ?? 0.5;
  const layer = parsed.data.layer ?? inferMemoryLayer(attentionScore);
  const expiresAt = parsed.data.ttlSeconds
    ? new Date(Date.now() + parsed.data.ttlSeconds * 1000)
    : null;
  const radar = await upsertRadarResident({
    slug: parsed.data.slug
  });

  const memory = await prisma.agentMemory.upsert({
    where: {
      agentId_key: {
        agentId: radar.id,
        key: parsed.data.key
      }
    },
    update: {
      focus: parsed.data.focus as Prisma.InputJsonValue,
      summary: parsed.data.summary,
      layer,
      attentionScore,
      expiresAt,
      lastActivatedAt: new Date()
    },
    create: {
      agentId: radar.id,
      key: parsed.data.key,
      focus: parsed.data.focus as Prisma.InputJsonValue,
      summary: parsed.data.summary,
      layer,
      attentionScore,
      expiresAt
    }
  });

  return NextResponse.json({ memory: toRadarMemory(memory) });
}

function toRadarMemory(memory: {
  id: string;
  key: string;
  focus: Prisma.JsonValue;
  summary: string | null;
  layer: MemoryLayer;
  attentionScore: number;
  expiresAt: Date | null;
  lastActivatedAt: Date;
  createdAt: Date;
  updatedAt: Date;
  agentId: string;
}) {
  return {
    id: memory.id,
    key: memory.key,
    focus: memory.focus,
    summary: memory.summary,
    layer: memory.layer,
    attentionScore: memory.attentionScore,
    expiresAt: memory.expiresAt,
    lastActivatedAt: memory.lastActivatedAt,
    createdAt: memory.createdAt,
    updatedAt: memory.updatedAt,
    radarId: memory.agentId
  };
}

function inferMemoryLayer(attentionScore: number) {
  if (attentionScore < 0.22) {
    return MemoryLayer.DEEP_ARCHIVE;
  }

  if (attentionScore < 0.58) {
    return MemoryLayer.WARM;
  }

  return MemoryLayer.WORKING;
}
