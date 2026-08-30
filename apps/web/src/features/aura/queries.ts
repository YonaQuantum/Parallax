import { AuraCardVariant, ContentStatus, type Prisma } from "@prisma/client";
import { prisma } from "@/server/db/prisma";

export type AuraProfile = {
  user: {
    id: string;
    name: string;
    handle: string;
    bio: string | null;
    image: string | null;
    createdAt: Date;
    contentCount: number;
    commentCount: number;
  };
  identity: {
    serial: string;
    code: string;
    generationVersion: string;
    displayName: string;
    handle: string;
    quote: string | null;
    skills: string[];
    cardVariant: AuraCardVariant;
    isFounder: boolean;
    avatarUrl: string | null;
    cardBackgroundUrl: string | null;
  } | null;
  contents: {
    slug: string;
    title: string;
    excerpt: string | null;
    publishedAt: Date | null;
  }[];
  externalProjects: {
    provider: string;
    fullName: string;
    url: string;
    description: string | null;
    language: string | null;
    stars: number | null;
    lastSyncedAt: Date | null;
  }[];
};

type AuraProfilePayload = Prisma.UserGetPayload<{
  include: {
    auraIdentity: true;
    contents: {
      select: {
        slug: true;
        title: true;
        excerpt: true;
        publishedAt: true;
      };
    };
    externalProjects: {
      select: {
        provider: true;
        fullName: true;
        url: true;
        description: true;
        language: true;
        stars: true;
        lastSyncedAt: true;
      };
    };
    _count: {
      select: {
        contents: true;
        comments: true;
      };
    };
  };
}>;

export async function getMemberProfiles(): Promise<AuraProfile[]> {
  const users = await prisma.user.findMany({
    include: {
      auraIdentity: true,
      contents: {
        where: { status: ContentStatus.PUBLISHED },
        select: {
          slug: true,
          title: true,
          excerpt: true,
          publishedAt: true
        },
        orderBy: [{ publishedAt: "desc" }, { createdAt: "desc" }],
        take: 3
      },
      externalProjects: {
        where: { selected: true },
        select: {
          provider: true,
          fullName: true,
          url: true,
          description: true,
          language: true,
          stars: true,
          lastSyncedAt: true
        },
        orderBy: [{ lastSyncedAt: "desc" }, { updatedAt: "desc" }],
        take: 6
      },
      _count: {
        select: {
          contents: {
            where: { status: ContentStatus.PUBLISHED }
          },
          comments: true
        }
      }
    },
    orderBy: [{ role: "asc" }, { createdAt: "asc" }]
  });

  return users.map(toAuraProfile);
}

export async function getProfileByHandle(handle: string): Promise<AuraProfile | null> {
  const user = await prisma.user.findFirst({
    where: {
      OR: [
        { handle },
        {
          auraIdentity: {
            is: { handle }
          }
        }
      ]
    },
    include: {
      auraIdentity: true,
      contents: {
        where: { status: ContentStatus.PUBLISHED },
        select: {
          slug: true,
          title: true,
          excerpt: true,
          publishedAt: true
        },
        orderBy: [{ publishedAt: "desc" }, { createdAt: "desc" }],
        take: 12
      },
      externalProjects: {
        where: { selected: true },
        select: {
          provider: true,
          fullName: true,
          url: true,
          description: true,
          language: true,
          stars: true,
          lastSyncedAt: true
        },
        orderBy: [{ lastSyncedAt: "desc" }, { updatedAt: "desc" }],
        take: 6
      },
      _count: {
        select: {
          contents: {
            where: { status: ContentStatus.PUBLISHED }
          },
          comments: true
        }
      }
    }
  });

  return user ? toAuraProfile(user) : null;
}

function toAuraProfile(user: AuraProfilePayload): AuraProfile {
  return {
    user: {
      id: user.id,
      name: user.name ?? user.handle,
      handle: user.handle,
      bio: user.bio,
      image: user.image,
      createdAt: user.createdAt,
      contentCount: user._count.contents,
      commentCount: user._count.comments
    },
    identity: user.auraIdentity
      ? {
          serial: user.auraIdentity.serial,
          code: user.auraIdentity.code,
          generationVersion: user.auraIdentity.generationVersion,
          displayName: user.auraIdentity.displayName,
          handle: user.auraIdentity.handle,
          quote: user.auraIdentity.quote,
          skills: parseSkills(user.auraIdentity.skills),
          cardVariant: user.auraIdentity.cardVariant,
          isFounder: user.auraIdentity.isFounder,
          avatarUrl: user.auraIdentity.avatarUrl,
          cardBackgroundUrl: user.auraIdentity.cardBackgroundUrl
        }
      : null,
    contents: user.contents,
    externalProjects: user.externalProjects
  };
}

function parseSkills(value: unknown) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}
