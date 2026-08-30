import {
  IdentityCardVariant,
  IdentityCardStatus,
  KnowledgeDomain,
  PrismaClient,
  UserRole
} from "@prisma/client";
import { randomBytes, randomInt } from "node:crypto";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();
const IDENTITY_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

const removedDemoContentSlugs = [
  "self-hosted-community-stack",
  "plugin-first-community",
  "video-notes-terminal-workflow"
];

async function main() {
  const ownerEmail = process.env.SEED_OWNER_EMAIL ?? "owner@example.local";
  const ownerPassword = process.env.SEED_OWNER_PASSWORD;
  const ownerHandle = process.env.SEED_OWNER_HANDLE ?? "owner";
  const ownerName = process.env.SEED_OWNER_NAME ?? "Owner";

  await cleanupDemoData();
  await seedDomainClocks();
  await seedOwner({
    email: ownerEmail,
    handle: ownerHandle,
    name: ownerName,
    password: ownerPassword
  });
}

async function seedOwner(input: {
  email: string;
  handle: string;
  name: string;
  password?: string;
}) {
  if (!input.password) {
    console.warn("SEED_OWNER_PASSWORD is not set; owner account will be created without password login.");
  }

  const passwordHash = input.password ? await bcrypt.hash(input.password, 12) : undefined;
  const existingUser = await prisma.user.findFirst({
    where: {
      OR: [
        { email: input.email },
        { handle: input.handle }
      ]
    },
    select: {
      id: true
    }
  });
  const userData = {
    email: input.email,
    name: input.name,
    role: UserRole.OWNER,
    emailVerified: new Date(),
    ...(passwordHash ? { passwordHash } : {})
  };
  const user = existingUser
    ? await prisma.user.update({
        where: { id: existingUser.id },
        data: userData
      })
    : await prisma.user.create({
        data: {
          ...userData,
          handle: input.handle
        }
      });
  const existingIdentity = await prisma.identityCard.findUnique({
    where: { serial: "PX-0001" },
    select: { code: true }
  });

  await prisma.identityCard.upsert({
    where: { serial: "PX-0001" },
    update: {
      displayName: input.name,
      handle: user.handle,
      status: IdentityCardStatus.CLAIMED,
      cardVariant: IdentityCardVariant.MOON,
      isFounder: true,
      userId: user.id
    },
    create: {
      serial: "PX-0001",
      code: process.env.SEED_OWNER_IDENTITY_CODE ?? existingIdentity?.code ?? generateIdentityCode(),
      generationVersion: "identity-card-v1",
      displayName: input.name,
      handle: user.handle,
      quote: "PARALLAX founder",
      skills: [],
      status: IdentityCardStatus.CLAIMED,
      cardVariant: IdentityCardVariant.MOON,
      isFounder: true,
      userId: user.id
    }
  });
}

async function seedDomainClocks() {
  const clocks: { domain: KnowledgeDomain; heartbeatSeconds: number }[] = [
    { domain: KnowledgeDomain.CODE, heartbeatSeconds: 1800 },
    { domain: KnowledgeDomain.AI_MODELS, heartbeatSeconds: 1800 },
    { domain: KnowledgeDomain.GAME_INTERACTION, heartbeatSeconds: 2400 },
    { domain: KnowledgeDomain.HARDWARE_EMBEDDED, heartbeatSeconds: 7200 },
    { domain: KnowledgeDomain.CREATIVE_MEDIA, heartbeatSeconds: 3600 },
    { domain: KnowledgeDomain.SCIENCE_COSMOS, heartbeatSeconds: 43200 }
  ];

  for (const clock of clocks) {
    await prisma.domainClock.upsert({
      where: { domain: clock.domain },
      update: {
        heartbeatSeconds: clock.heartbeatSeconds,
        enabled: true
      },
      create: {
        domain: clock.domain,
        heartbeatSeconds: clock.heartbeatSeconds,
        enabled: true
      }
    });
  }
}

async function cleanupDemoData() {
  await prisma.content.deleteMany({
    where: {
      slug: {
        in: removedDemoContentSlugs
      }
    }
  });

  await prisma.communityExtension.deleteMany({
    where: {
      slug: "content-blocks"
    }
  });
}

function generateIdentityCode() {
  return Array.from({ length: 3 }, () => randomIdentitySegment()).join("-");
}

function randomIdentitySegment() {
  const bytes = randomBytes(4);
  return Array.from(bytes, () => IDENTITY_ALPHABET[randomInt(IDENTITY_ALPHABET.length)]).join("");
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
