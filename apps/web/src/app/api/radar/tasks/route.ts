import { AgentTaskPriority, AgentTaskStatus, UserRole, type Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/server/auth";
import { findRadarBySlug, upsertRadarResident } from "@/server/radar/residents";
import { hasRadarAccess, requireRadarAccess } from "@/server/radar/security";
import { prisma } from "@/server/db/prisma";

export const dynamic = "force-dynamic";

const querySchema = z.object({
  slug: z.string().min(1).optional(),
  take: z.coerce.number().int().positive().max(50).default(10)
});

const taskCreateSchema = z.object({
  slug: z.string().min(1).optional(),
  type: z.string().min(1).max(120),
  priority: z.nativeEnum(AgentTaskPriority).default(AgentTaskPriority.NORMAL),
  payload: z.unknown(),
  scheduledAt: z.coerce.date().optional()
});

const taskPatchSchema = z.object({
  id: z.string().min(1),
  status: z.nativeEnum(AgentTaskStatus),
  conclusion: z.unknown().optional(),
  error: z.string().max(8000).optional()
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

  const radar = parsed.data.slug ? await findRadarBySlug(parsed.data.slug) : null;
  const tasks = await prisma.agentTask.findMany({
    where: {
      status: AgentTaskStatus.QUEUED,
      scheduledAt: { lte: new Date() },
      ...(parsed.data.slug ? { OR: [{ agentId: radar?.id ?? "__missing__" }, { agentId: null }] } : {})
    },
    orderBy: [{ priority: "desc" }, { scheduledAt: "asc" }],
    take: parsed.data.take,
    select: {
      id: true,
      type: true,
      priority: true,
      payload: true,
      scheduledAt: true,
      agentId: true
    }
  });

  return NextResponse.json({
    tasks: tasks.map((task) => ({
      id: task.id,
      type: task.type,
      priority: task.priority,
      payload: task.payload,
      scheduledAt: task.scheduledAt,
      radarId: task.agentId
    }))
  });
}

export async function POST(request: Request) {
  const session = await auth();
  const radarAuthorized = hasRadarAccess(request);
  const userCanCreate =
    session?.user.role === UserRole.OWNER || session?.user.role === UserRole.MODERATOR;

  if (!radarAuthorized && !userCanCreate) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = taskCreateSchema.safeParse(await request.json());

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid task" }, { status: 400 });
  }

  const radar = parsed.data.slug
    ? await upsertRadarResident({
        slug: parsed.data.slug,
        createdById: session?.user.id
      })
    : null;
  const task = await prisma.agentTask.create({
    data: {
      type: parsed.data.type,
      priority: parsed.data.priority,
      payload: parsed.data.payload as Prisma.InputJsonValue,
      scheduledAt: parsed.data.scheduledAt ?? new Date(),
      agentId: radar?.id,
      createdById: session?.user.id
    }
  });

  return NextResponse.json({ task: toRadarTask(task) }, { status: 201 });
}

export async function PATCH(request: Request) {
  const denied = requireRadarAccess(request);

  if (denied) {
    return denied;
  }

  const parsed = taskPatchSchema.safeParse(await request.json());

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid task update" }, { status: 400 });
  }

  const now = new Date();
  const task = await prisma.agentTask.update({
    where: { id: parsed.data.id },
    data: {
      status: parsed.data.status,
      conclusion: parsed.data.conclusion as Prisma.InputJsonValue,
      error: parsed.data.error,
      startedAt: parsed.data.status === AgentTaskStatus.RUNNING ? now : undefined,
      completedAt:
        parsed.data.status === AgentTaskStatus.COMPLETED ||
        parsed.data.status === AgentTaskStatus.FAILED ||
        parsed.data.status === AgentTaskStatus.CANCELLED
          ? now
          : undefined,
      suspendedAt: parsed.data.status === AgentTaskStatus.SUSPENDED ? now : undefined
    }
  });

  return NextResponse.json({ task: toRadarTask(task) });
}

function toRadarTask(task: {
  id: string;
  type: string;
  priority: AgentTaskPriority;
  status: AgentTaskStatus;
  payload: Prisma.JsonValue;
  conclusion: Prisma.JsonValue | null;
  error: string | null;
  scheduledAt: Date;
  startedAt: Date | null;
  completedAt: Date | null;
  suspendedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  agentId: string | null;
  createdById: string | null;
}) {
  return {
    id: task.id,
    type: task.type,
    priority: task.priority,
    status: task.status,
    payload: task.payload,
    conclusion: task.conclusion,
    error: task.error,
    scheduledAt: task.scheduledAt,
    startedAt: task.startedAt,
    completedAt: task.completedAt,
    suspendedAt: task.suspendedAt,
    createdAt: task.createdAt,
    updatedAt: task.updatedAt,
    radarId: task.agentId,
    createdById: task.createdById
  };
}
