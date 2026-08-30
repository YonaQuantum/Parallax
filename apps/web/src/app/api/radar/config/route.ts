import { NextResponse } from "next/server";
import { z } from "zod";
import { readLocalRadarConfig } from "@/server/radar/config";
import { requireRadarAccess } from "@/server/radar/security";

export const dynamic = "force-dynamic";

const querySchema = z.object({
  slug: z.string().min(1)
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

  const config = await readLocalRadarConfig(parsed.data.slug);

  if (!config) {
    return NextResponse.json({ radar: null }, { status: 404 });
  }

  return NextResponse.json({
    radar: {
      slug: config.slug,
      name: config.name ?? config.slug,
      enabled: config.enabled ?? true,
      sources: config.sources ?? [],
      providers: Object.fromEntries(
        Object.entries(config.providers ?? {}).map(([provider, fields]) => [
          provider,
          Object.keys(fields)
        ])
      )
    }
  });
}
