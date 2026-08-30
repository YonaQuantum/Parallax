import { NextResponse } from "next/server";
import { site } from "@/config/site";

export function GET() {
  return NextResponse.json({
    ok: true,
    service: site.serviceName,
    time: new Date().toISOString()
  });
}
