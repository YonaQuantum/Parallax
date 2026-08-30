import { AgentSignalSeverity, type Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";
import { upsertRadarResident } from "@/server/radar/residents";
import { requireRadarAccess } from "@/server/radar/security";
import { prisma } from "@/server/db/prisma";

export const dynamic = "force-dynamic";

const signalSchema = z.object({
  slug: z.string().min(1).optional(),
  severity: z.nativeEnum(AgentSignalSeverity).default(AgentSignalSeverity.INFO),
  title: z.string().min(1).max(180),
  body: z.string().max(8000).optional(),
  payload: z.unknown().optional(),
  ttlSeconds: z.number().int().positive().max(60 * 60 * 24 * 30).optional()
});

export async function GET() {
  const signals = await prisma.agentSignal.findMany({
    where: {
      acknowledgedAt: null,
      OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }]
    },
    orderBy: [{ severity: "desc" }, { createdAt: "desc" }],
    take: 30,
    select: {
      id: true,
      severity: true,
      title: true,
      body: true,
      payload: true,
      createdAt: true,
      expiresAt: true,
      agent: {
        select: {
          slug: true,
          name: true
        }
      }
    }
  });

  return NextResponse.json({
    signals: signals.map((signal) => ({
      id: signal.id,
      severity: signal.severity,
      title: signal.title,
      body: signal.body,
      payload: signal.payload,
      createdAt: signal.createdAt,
      expiresAt: signal.expiresAt,
      radar: signal.agent
    }))
  });
}

export async function POST(request: Request) {
  const denied = requireRadarAccess(request);

  if (denied) {
    return denied;
  }

  const parsed = signalSchema.safeParse(await request.json());

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid signal" }, { status: 400 });
  }

  const radar = parsed.data.slug
    ? await upsertRadarResident({
        slug: parsed.data.slug
      })
    : null;
  const signal = await prisma.agentSignal.create({
    data: {
      agentId: radar?.id,
      severity: parsed.data.severity,
      title: parsed.data.title,
      body: parsed.data.body,
      payload: parsed.data.payload as Prisma.InputJsonValue,
      expiresAt: parsed.data.ttlSeconds
        ? new Date(Date.now() + parsed.data.ttlSeconds * 1000)
        : null
    }
  });

  return NextResponse.json({
    signal: {
      id: signal.id,
      severity: signal.severity,
      title: signal.title,
      body: signal.body,
      payload: signal.payload,
      expiresAt: signal.expiresAt,
      createdAt: signal.createdAt,
      radarId: signal.agentId
    }
  }, { status: 201 });
}
