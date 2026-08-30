import { NextResponse } from "next/server";
import { prisma } from "@/server/db/prisma";

export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;

    return NextResponse.json({
      ok: true,
      checks: {
        database: "up"
      },
      time: new Date().toISOString()
    });
  } catch {
    return NextResponse.json(
      {
        ok: false,
        checks: {
          database: "down"
        },
        time: new Date().toISOString()
      },
      { status: 503 }
    );
  }
}
