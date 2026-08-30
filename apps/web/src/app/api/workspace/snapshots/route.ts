import { type Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/server/auth";
import { prisma } from "@/server/db/prisma";

export const dynamic = "force-dynamic";

const querySchema = z.object({
  boardKey: z.string().min(1).default("main")
});

const snapshotSchema = z.object({
  boardKey: z.string().min(1).default("main"),
  payload: z.unknown(),
  clientId: z.string().max(120).optional()
});

export async function GET(request: Request) {
  const session = await auth();

  if (!session?.user.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = querySchema.safeParse(Object.fromEntries(new URL(request.url).searchParams));

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid query" }, { status: 400 });
  }

  const snapshot = await prisma.canvasSnapshot.findUnique({
    where: {
      userId_boardKey: {
        userId: session.user.id,
        boardKey: parsed.data.boardKey
      }
    }
  });

  return NextResponse.json({ snapshot });
}

export async function PUT(request: Request) {
  const session = await auth();

  if (!session?.user.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = snapshotSchema.safeParse(await request.json());

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid snapshot" }, { status: 400 });
  }

  const snapshot = await prisma.canvasSnapshot.upsert({
    where: {
      userId_boardKey: {
        userId: session.user.id,
        boardKey: parsed.data.boardKey
      }
    },
    update: {
      payload: parsed.data.payload as Prisma.InputJsonValue,
      clientId: parsed.data.clientId,
      version: { increment: 1 }
    },
    create: {
      userId: session.user.id,
      boardKey: parsed.data.boardKey,
      payload: parsed.data.payload as Prisma.InputJsonValue,
      clientId: parsed.data.clientId
    }
  });

  return NextResponse.json({ snapshot });
}
