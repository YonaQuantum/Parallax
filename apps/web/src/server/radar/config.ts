import "server-only";

import { readFile } from "node:fs/promises";
import path from "node:path";
import { z } from "zod";

const sourceSchema = z.object({
  type: z.string(),
  title: z.string().optional(),
  domain: z.string().optional(),
  query: z.string().optional(),
  url: z.string().optional(),
  heartbeatSeconds: z.number().int().positive().optional()
});

const radarConfigSchema = z.object({
  slug: z.string(),
  name: z.string().optional(),
  enabled: z.boolean().optional(),
  providers: z.record(z.string(), z.record(z.string(), z.string())).optional(),
  sources: z.array(sourceSchema).optional()
});

const configSchema = z.object({
  radars: z.array(radarConfigSchema).optional()
});

export type LocalRadarConfig = z.infer<typeof radarConfigSchema>;

export async function readLocalRadarConfig(slug: string): Promise<LocalRadarConfig | null> {
  const configuredPath =
    process.env.RADAR_CONFIG_PATH ??
    "./config/radars.local.json";
  const filePath = path.isAbsolute(configuredPath)
    ? configuredPath
    : path.resolve(/*turbopackIgnore: true*/ process.cwd(), "../..", configuredPath);

  try {
    const raw = await readFile(filePath, "utf8");
    const parsed = configSchema.parse(JSON.parse(raw));
    const radars = parsed.radars ?? [];
    return radars.find((radar) => radar.slug === slug) ?? null;
  } catch (error) {
    if (isMissingFile(error)) {
      return null;
    }

    throw error;
  }
}

function isMissingFile(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "ENOENT"
  );
}
