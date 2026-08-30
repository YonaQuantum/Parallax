import "server-only";

import { prisma } from "@/server/db/prisma";

const DEFAULT_RETENTION_DAYS = 3;
const DEFAULT_MAX_VISIBLE = 72;
const DEFAULT_INCOMPLETE_GRACE_HOURS = 12;

export async function recycleExternalArtifacts(now = new Date()) {
  const retentionDays = readIntEnv("RADAR_ARTIFACT_RETENTION_DAYS", DEFAULT_RETENTION_DAYS, 1, 90);
  const maxVisible = readIntEnv("RADAR_ARTIFACT_MAX_VISIBLE", DEFAULT_MAX_VISIBLE, 12, 500);
  const incompleteGraceHours = readIntEnv(
    "RADAR_INCOMPLETE_ARTIFACT_GRACE_HOURS",
    DEFAULT_INCOMPLETE_GRACE_HOURS,
    1,
    168
  );
  const archivedAt = now;
  const cutoff = new Date(now.getTime() - retentionDays * 24 * 60 * 60 * 1000);
  const incompleteCutoff = new Date(now.getTime() - incompleteGraceHours * 60 * 60 * 1000);

  const stale = await prisma.ingestedArtifact.updateMany({
    where: {
      deepArchivedAt: null,
      createdAt: {
        lt: cutoff
      }
    },
    data: {
      deepArchivedAt: archivedAt
    }
  });
  const incompleteArtifacts = await prisma.ingestedArtifact.findMany({
    where: {
      deepArchivedAt: null,
      createdAt: {
        lt: incompleteCutoff
      }
    },
    select: {
      id: true,
      metadata: true
    }
  });
  const incompleteIds = incompleteArtifacts
    .filter((artifact) => shouldRecycleIncompleteArtifact(artifact.metadata))
    .map((artifact) => artifact.id);
  const incomplete = incompleteIds.length > 0
    ? await prisma.ingestedArtifact.updateMany({
        where: {
          id: {
            in: incompleteIds
          }
        },
        data: {
          deepArchivedAt: archivedAt
        }
      })
    : { count: 0 };

  const overflow = await prisma.ingestedArtifact.findMany({
    where: {
      deepArchivedAt: null
    },
    orderBy: [{ createdAt: "desc" }, { heat: "desc" }],
    skip: maxVisible,
    select: {
      id: true
    }
  });

  if (overflow.length === 0) {
    return {
      stale: stale.count,
      incomplete: incomplete.count,
      overflow: 0
    };
  }

  const archivedOverflow = await prisma.ingestedArtifact.updateMany({
    where: {
      id: {
        in: overflow.map((artifact) => artifact.id)
      }
    },
    data: {
      deepArchivedAt: archivedAt
    }
  });

  return {
    stale: stale.count,
    incomplete: incomplete.count,
    overflow: archivedOverflow.count
  };
}

function shouldRecycleIncompleteArtifact(metadata: unknown) {
  const record = metadata && typeof metadata === "object" && !Array.isArray(metadata)
    ? metadata as Record<string, unknown>
    : {};
  const thumbnailUrl = readString(record.thumbnailUrl);
  const displayTitle = readString(record.displayTitle);
  const summary = readString(record.summary);
  const whyItMatters = readString(record.whyItMatters) ?? readString(record.whyInteresting);

  return !thumbnailUrl && !/[\u4e00-\u9fff]/.test(`${displayTitle}\n${summary}\n${whyItMatters}`);
}

function readString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function readIntEnv(name: string, fallback: number, min: number, max: number) {
  const value = Number(process.env[name]);

  if (!Number.isInteger(value)) {
    return fallback;
  }

  return Math.min(max, Math.max(min, value));
}
