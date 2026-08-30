import "server-only";

import { AgentResidentStatus, type Prisma } from "@prisma/client";
import { prisma } from "@/server/db/prisma";

type RadarResidentInput = {
  slug: string;
  name?: string;
  scopes?: Prisma.InputJsonValue;
  config?: Prisma.InputJsonValue;
  heartbeatSeconds?: number;
  createdById?: string;
};

export async function upsertRadarResident(input: RadarResidentInput) {
  return prisma.agentResident.upsert({
    where: { slug: input.slug },
    update: {
      name: input.name ?? undefined,
      scopes: input.scopes ?? undefined,
      config: input.config ?? undefined,
      heartbeatSeconds: input.heartbeatSeconds ?? undefined,
      status: AgentResidentStatus.ACTIVE,
      lastSeenAt: new Date()
    },
    create: {
      slug: input.slug,
      name: input.name ?? input.slug,
      scopes: input.scopes,
      config: input.config,
      heartbeatSeconds: input.heartbeatSeconds ?? 30,
      status: AgentResidentStatus.ACTIVE,
      lastSeenAt: new Date(),
      createdById: input.createdById
    }
  });
}

export async function findRadarBySlug(slug: string) {
  return prisma.agentResident.findUnique({
    where: { slug }
  });
}
