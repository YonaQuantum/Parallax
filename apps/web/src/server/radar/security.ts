import "server-only";

import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";

export function hasRadarAccess(request: Request) {
  const expected = process.env.RADAR_SHARED_SECRET;
  const header = request.headers.get("authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice("Bearer ".length).trim() : "";

  if (!expected || !token) {
    return false;
  }

  const expectedBuffer = Buffer.from(expected);
  const tokenBuffer = Buffer.from(token);

  return (
    expectedBuffer.length === tokenBuffer.length &&
    timingSafeEqual(expectedBuffer, tokenBuffer)
  );
}

export function requireRadarAccess(request: Request) {
  if (!hasRadarAccess(request)) {
    return NextResponse.json({ error: "Unauthorized radar" }, { status: 401 });
  }

  return null;
}
