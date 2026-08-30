import { IdentityCardVariant, ContentStatus, type Prisma } from "@prisma/client";
import { prisma } from "@/server/db/prisma";

export type IdentityProfile = {
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
    cardVariant: IdentityCardVariant;
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

type IdentityProfilePayload = Prisma.UserGetPayload<{
  include: {
    identityCard: true;
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

export async function getMemberProfiles(): Promise<IdentityProfile[]> {
  const users = await prisma.user.findMany({
    include: {
      identityCard: true,
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

  return users.map(toIdentityProfile);
}

export async function getProfileByHandle(handle: string): Promise<IdentityProfile | null> {
  const user = await prisma.user.findFirst({
    where: {
      OR: [
        { handle },
        {
          identityCard: {
            is: { handle }
          }
        }
      ]
    },
    include: {
      identityCard: true,
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

  return user ? toIdentityProfile(user) : null;
}

function toIdentityProfile(user: IdentityProfilePayload): IdentityProfile {
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
    identity: user.identityCard
      ? {
          serial: user.identityCard.serial,
          code: user.identityCard.code,
          generationVersion: user.identityCard.generationVersion,
          displayName: user.identityCard.displayName,
          handle: user.identityCard.handle,
          quote: user.identityCard.quote,
          skills: parseSkills(user.identityCard.skills),
          cardVariant: user.identityCard.cardVariant,
          isFounder: user.identityCard.isFounder,
          avatarUrl: user.identityCard.avatarUrl,
          cardBackgroundUrl: user.identityCard.cardBackgroundUrl
        }
      : null,
    contents: user.contents,
    externalProjects: user.externalProjects
  };
}

function parseSkills(value: unknown) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}
