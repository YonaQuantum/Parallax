import { AgentTaskPriority, AgentTaskStatus, type Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";
import { computeResourceMode } from "@/server/radar/prism";
import { upsertRadarResident } from "@/server/radar/residents";
import { requireRadarAccess } from "@/server/radar/security";
import { prisma } from "@/server/db/prisma";

export const dynamic = "force-dynamic";

const telemetrySchema = z.object({
  fps: z.number().finite().nonnegative().optional(),
  cpuLoad: z.number().finite().min(0).max(1).optional(),
  memoryPressure: z.number().finite().min(0).max(1).optional(),
  gpuLoad: z.number().finite().min(0).max(1).optional(),
  batteryLevel: z.number().finite().min(0).max(1).optional()
});

const heartbeatSchema = z.object({
  slug: z.string().min(1),
  name: z.string().min(1).optional(),
  scopes: z.unknown().optional(),
  telemetry: telemetrySchema.optional(),
  heartbeatSeconds: z.number().int().positive().max(3600).optional()
});

export async function POST(request: Request) {
  const denied = requireRadarAccess(request);

  if (denied) {
    return denied;
  }

  const parsed = heartbeatSchema.safeParse(await request.json());

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid heartbeat" }, { status: 400 });
  }

  const radar = await upsertRadarResident({
    slug: parsed.data.slug,
    name: parsed.data.name,
    scopes: parsed.data.scopes as Prisma.InputJsonValue,
    heartbeatSeconds: parsed.data.heartbeatSeconds
  });

  const mode = parsed.data.telemetry
    ? computeResourceMode(parsed.data.telemetry)
    : { loadScore: 0, suggestedMode: "normal" };

  if (parsed.data.telemetry) {
    await prisma.agentResourceSample.create({
      data: {
        ...parsed.data.telemetry,
        ...mode,
        agentId: radar.id
      }
    });
  }

  if (mode.suggestedMode === "suspend_deep_tasks") {
    await prisma.agentTask.updateMany({
      where: {
        agentId: radar.id,
        status: AgentTaskStatus.QUEUED,
        priority: {
          in: [AgentTaskPriority.LOW, AgentTaskPriority.NORMAL]
        }
      },
      data: {
        status: AgentTaskStatus.SUSPENDED,
        suspendedAt: new Date()
      }
    });
  }

  const take = mode.suggestedMode === "normal" ? 5 : mode.suggestedMode === "throttle" ? 2 : 0;
  const tasks =
    take > 0
      ? await prisma.agentTask.findMany({
          where: {
            status: AgentTaskStatus.QUEUED,
            scheduledAt: { lte: new Date() },
            OR: [{ agentId: radar.id }, { agentId: null }]
          },
          orderBy: [{ priority: "desc" }, { scheduledAt: "asc" }],
          take,
          select: {
            id: true,
            type: true,
            priority: true,
            payload: true,
            scheduledAt: true
          }
        })
      : [];

  return NextResponse.json({
    radar: {
      id: radar.id,
      slug: radar.slug,
      status: radar.status,
      heartbeatSeconds: radar.heartbeatSeconds,
      lastSeenAt: radar.lastSeenAt
    },
    resource: mode,
    tasks
  });
}
