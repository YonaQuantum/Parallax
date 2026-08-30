import "server-only";

import {
  KnowledgeDomain,
  KnowledgeInterference
} from "@prisma/client";
import { site } from "@/config/site";
import { prisma } from "@/server/db/prisma";

export type WorldSignal = {
  id: string;
  title: string;
  summary: string | null;
  href: string | null;
  thumbnailUrl: string | null;
  source: string;
  domain: string;
  phase: "NEW" | "RISING" | "ACTIVE" | "COOLING";
  time: string;
  createdAt: Date;
  tags: string[];
};

const domainLabel: Record<KnowledgeDomain, string> = {
  CODE: "CODE",
  AI_MODELS: "AI",
  GAME_INTERACTION: "GAME",
  HARDWARE_EMBEDDED: "HARDWARE",
  CREATIVE_MEDIA: "MEDIA",
  SCIENCE_COSMOS: "SCIENCE",
  GENERAL: "GENERAL"
};

const domainTagName: Record<KnowledgeDomain, string> = {
  CODE: "编程与开源",
  AI_MODELS: "AI 与模型",
  GAME_INTERACTION: "游戏与交互",
  HARDWARE_EMBEDDED: "硬件与嵌入式",
  CREATIVE_MEDIA: "创作与媒体",
  SCIENCE_COSMOS: "科学与宇宙",
  GENERAL: "通用"
};

const timeFormatter = new Intl.DateTimeFormat("zh-CN", {
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
  timeZone: "Asia/Shanghai"
});

export async function getWorldSignals({
  balanced = false,
  query,
  take = 8
}: {
  balanced?: boolean;
  query?: string;
  take?: number;
} = {}) {
  const keyword = query?.trim();
  const artifacts = await prisma.ingestedArtifact.findMany({
    where: {
      interference: {
        not: KnowledgeInterference.BLOCKED
      },
      deepArchivedAt: null,
      ...(keyword
        ? {
            OR: [
              { title: { contains: keyword, mode: "insensitive" as const } },
              { source: { is: { title: { contains: keyword, mode: "insensitive" as const } } } },
              { source: { is: { sourceType: { contains: keyword, mode: "insensitive" as const } } } }
            ]
          }
        : {})
    },
    orderBy: [{ createdAt: "desc" }, { heat: "desc" }],
    take: balanced && !keyword ? Math.max(take * 12, 72) : take,
    include: {
      tags: {
        include: {
          tag: {
            select: {
              name: true
            }
          }
        },
        take: 3
      },
      source: {
        select: {
          title: true,
          sourceType: true,
          url: true
        }
      }
    }
  });

  const orderedArtifacts = balanced && !keyword ? balanceArtifactsByDomain(artifacts, take) : artifacts;

  return orderedArtifacts.map((artifact): WorldSignal => {
    const metadata = asRecord(artifact.metadata);
    return {
      id: `artifact-${artifact.id}`,
      title: artifact.title,
      summary: readSignalSummary(metadata, artifact.domain),
      href: artifact.url,
      thumbnailUrl: readUrl(metadata, "thumbnailUrl"),
      source:
        readString(metadata, "sourceName") ??
        artifact.source?.title ??
        artifact.source?.sourceType ??
        site.radarName,
      domain: domainLabel[artifact.domain],
      phase: resolveArtifactPhase(artifact.createdAt, artifact.freshnessUntil, artifact.heat),
      time: timeFormatter.format(artifact.createdAt),
      createdAt: artifact.createdAt,
      tags: artifact.tags.length > 0
        ? artifact.tags.map((item) => item.tag.name)
        : [domainTagName[artifact.domain]]
    };
  });
}

function balanceArtifactsByDomain<T extends { domain: KnowledgeDomain }>(artifacts: T[], take: number) {
  const selected: T[] = [];
  const used = new Set<KnowledgeDomain>();

  for (const artifact of artifacts) {
    if (used.has(artifact.domain)) {
      continue;
    }

    selected.push(artifact);
    used.add(artifact.domain);

    if (selected.length >= take) {
      return selected;
    }
  }

  for (const artifact of artifacts) {
    if (selected.includes(artifact)) {
      continue;
    }

    selected.push(artifact);

    if (selected.length >= take) {
      return selected;
    }
  }

  return selected;
}

function resolveArtifactPhase(
  createdAt: Date,
  freshnessUntil: Date | null,
  heat: number
): WorldSignal["phase"] {
  const ageHours = (Date.now() - createdAt.getTime()) / 1000 / 60 / 60;

  if (ageHours <= 6) {
    return "NEW";
  }

  if (heat >= 0.72) {
    return "RISING";
  }

  if (freshnessUntil && freshnessUntil > new Date()) {
    return "ACTIVE";
  }

  return "COOLING";
}

function asRecord(value: unknown) {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }

  return null;
}

function readString(record: Record<string, unknown> | null, key: string) {
  const value = record?.[key];
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function readSignalSummary(record: Record<string, unknown> | null, domain: KnowledgeDomain) {
  const summary = readString(record, "summary");
  const whyItMatters = readString(record, "whyItMatters") ?? readString(record, "whyInteresting");

  if (site.locale === "zh-CN" && summary && /[\u4e00-\u9fff]/.test(summary)) {
    return summary;
  }

  return whyItMatters ?? domainFallbackSummary[domain] ?? summary;
}

const domainFallbackSummary: Record<KnowledgeDomain, string> = {
  CODE: "一个外部开源或工程信号进入视野，适合继续评估其工具链价值。",
  AI_MODELS: "一个 AI 或模型相关信号进入视野，适合继续判断其真实能力与可复用性。",
  GAME_INTERACTION: "一个游戏与交互方向的信号进入视野，适合观察其原型和工具链潜力。",
  HARDWARE_EMBEDDED: "一个硬件或嵌入式方向的信号进入视野，适合评估可复现性与实践价值。",
  CREATIVE_MEDIA: "一个创作与媒体方向的信号进入视野，适合观察其工作流和表达潜力。",
  SCIENCE_COSMOS: "一个科学与宇宙方向的信号进入视野，适合继续追踪其证据和想象力价值。",
  GENERAL: "一个外部信号进入视野，适合继续判断是否值得社区讨论。"
};

function readUrl(record: Record<string, unknown> | null, key: string) {
  const value = readString(record, key);
  if (!value) {
    return null;
  }

  try {
    const url = new URL(value);
    return ["http:", "https:"].includes(url.protocol) ? url.toString() : null;
  } catch {
    return null;
  }
}
