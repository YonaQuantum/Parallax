import {
  ContentStatus,
  type Content,
  type ContentType as PrismaContentType,
  type RelationType
} from "@prisma/client";
import { prisma } from "@/server/db/prisma";
import {
  contentTypeAccent,
  type ContentItem,
  type ContentType
} from "@/features/content/content-metadata";

type DbContent = Content & {
  author: {
    name: string | null;
    handle: string;
  };
  tags: {
    tag: {
      name: string;
    };
  }[];
  _count: {
    comments: number;
    bookmarks: number;
  };
};

export type ContentDetail = ContentItem & {
  body: string;
  videoUrl?: string | null;
  coverImage?: string | null;
  commentList: {
    id: string;
    body: string;
    author: string;
    authorHandle: string;
    createdAt: string;
  }[];
};

export type GraphNode = ContentItem & {
  id: string;
  x: number;
  y: number;
};

export type GraphEdge = {
  id: string;
  sourceId: string;
  targetId: string;
  type: RelationType;
  label: string;
  weight: number;
};

export type KnowledgeGraph = {
  nodes: GraphNode[];
  edges: GraphEdge[];
};

export type SiteStats = {
  contentCount: number;
  memberCount: number;
  founderCount: number;
};

export type TypeCount = {
  type: ContentType;
  count: number;
};

export type TagCount = {
  slug: string;
  name: string;
  count: number;
};

export type RecentComment = {
  id: string;
  body: string;
  author: string;
  authorHandle: string;
  contentSlug: string;
  contentTitle: string;
  createdAt: string;
};

const typeMap: Record<PrismaContentType, ContentType> = {
  ARTICLE: "article",
  DOC: "doc",
  VIDEO: "video",
  NOTE: "note"
};

const relationTypeLabel: Record<RelationType, string> = {
  REFERENCES: "引用",
  BUILDS_ON: "延展",
  RELATED: "相关",
  SERIES_NEXT: "系列"
};

export async function getPublishedContentFeed({ query }: { query?: string } = {}) {
  const keyword = query?.trim();
  const rows = await prisma.content.findMany({
    where: {
      status: ContentStatus.PUBLISHED,
      ...(keyword
        ? {
            OR: [
              { title: { contains: keyword, mode: "insensitive" as const } },
              { excerpt: { contains: keyword, mode: "insensitive" as const } },
              { author: { name: { contains: keyword, mode: "insensitive" as const } } },
              { author: { handle: { contains: keyword, mode: "insensitive" as const } } },
              {
                tags: {
                  some: {
                    tag: {
                      name: { contains: keyword, mode: "insensitive" as const }
                    }
                  }
                }
              }
            ]
          }
        : {})
    },
    include: {
      author: {
        select: {
          name: true,
          handle: true
        }
      },
      tags: {
        include: {
          tag: {
            select: { name: true }
          }
        },
        take: 1
      },
      _count: {
        select: {
          comments: true,
          bookmarks: true
        }
      }
    },
    orderBy: [{ featured: "desc" }, { publishedAt: "desc" }, { createdAt: "desc" }],
    take: 12
  });

  return rows.map(toContentItem);
}

export async function getPublishedContentBySlug(slug: string): Promise<ContentDetail | null> {
  const content = await prisma.content.findFirst({
    where: {
      slug,
      status: ContentStatus.PUBLISHED
    },
    include: {
      author: {
        select: {
          name: true,
          handle: true
        }
      },
      tags: {
        include: {
          tag: {
            select: { name: true }
          }
        },
        take: 1
      },
      _count: {
        select: {
          comments: true,
          bookmarks: true
        }
      },
      comments: {
        include: {
          author: {
            select: {
              name: true,
              handle: true
            }
          }
        },
        orderBy: { createdAt: "desc" },
        take: 30
      }
    }
  });

  if (!content) {
    return null;
  }

  return {
    ...toContentItem(content),
    body: readMarkdownBody(content.body),
    videoUrl: content.videoUrl,
    coverImage: content.coverImage,
    commentList: content.comments.map((comment) => ({
      id: comment.id,
      body: comment.body,
      author: comment.author.name ?? comment.author.handle,
      authorHandle: comment.author.handle,
      createdAt: formatDate(comment.createdAt)
    }))
  };
}

export async function getKnowledgeGraph(): Promise<KnowledgeGraph> {
  const contents = await prisma.content.findMany({
    where: { status: ContentStatus.PUBLISHED },
    include: {
      author: {
        select: {
          name: true,
          handle: true
        }
      },
      tags: {
        include: {
          tag: {
            select: { name: true }
          }
        },
        take: 1
      },
      _count: {
        select: {
          comments: true,
          bookmarks: true
        }
      }
    },
    orderBy: [{ featured: "desc" }, { publishedAt: "desc" }, { createdAt: "desc" }],
    take: 36
  });

  const contentIds = contents.map((content) => content.id);
  const relations =
    contentIds.length > 0
      ? await prisma.contentRelation.findMany({
          where: {
            sourceId: { in: contentIds },
            targetId: { in: contentIds }
          },
          orderBy: { createdAt: "asc" }
        })
      : [];

  return {
    nodes: contents.map((content, index) => ({
      id: content.id,
      ...toContentItem(content),
      ...calculateNodePosition(index, contents.length)
    })),
    edges: relations.map((relation) => ({
      id: relation.id,
      sourceId: relation.sourceId,
      targetId: relation.targetId,
      type: relation.type,
      label: relation.label ?? relationTypeLabel[relation.type],
      weight: relation.weight
    }))
  };
}

export async function getSiteStats(): Promise<SiteStats> {
  const [contentCount, memberCount, founderCount] = await Promise.all([
    prisma.content.count({ where: { status: ContentStatus.PUBLISHED } }),
    prisma.user.count(),
    prisma.auraIdentity.count({ where: { isFounder: true } })
  ]);

  return {
    contentCount,
    memberCount,
    founderCount
  };
}

export async function getContentTypeCounts(): Promise<TypeCount[]> {
  const rows = await prisma.content.groupBy({
    by: ["type"],
    where: { status: ContentStatus.PUBLISHED },
    _count: {
      type: true
    }
  });

  return rows.map((row) => ({
    type: typeMap[row.type],
    count: row._count.type
  }));
}

export async function getTopTags(): Promise<TagCount[]> {
  const tags = await prisma.tag.findMany({
    include: {
      _count: {
        select: { contents: true }
      }
    },
    orderBy: {
      contents: {
        _count: "desc"
      }
    },
    take: 8
  });

  return tags
    .filter((tag) => tag._count.contents > 0)
    .map((tag) => ({
      slug: tag.slug,
      name: tag.name,
      count: tag._count.contents
    }));
}

export async function getRecentComments(): Promise<RecentComment[]> {
  const comments = await prisma.comment.findMany({
    where: {
      content: {
        status: ContentStatus.PUBLISHED
      }
    },
    include: {
      author: {
        select: {
          name: true,
          handle: true
        }
      },
      content: {
        select: {
          slug: true,
          title: true
        }
      }
    },
    orderBy: { createdAt: "desc" },
    take: 5
  });

  return comments.map((comment) => ({
    id: comment.id,
    body: comment.body,
    author: comment.author.name ?? comment.author.handle,
    authorHandle: comment.author.handle,
    contentSlug: comment.content.slug,
    contentTitle: comment.content.title,
    createdAt: formatDate(comment.createdAt)
  }));
}

function toContentItem(content: DbContent): ContentItem {
  const type = typeMap[content.type];
  const publishedAtDate = content.publishedAt ?? content.createdAt;

  return {
    slug: content.slug,
    title: content.title,
    excerpt: content.excerpt ?? readMarkdownBody(content.body).slice(0, 140),
    type,
    tag: content.tags[0]?.tag.name ?? "未分类",
    author: content.author.name ?? content.author.handle,
    authorHandle: content.author.handle,
    publishedAt: formatDate(publishedAtDate),
    publishedAtDate,
    readTime: estimateReadTime(readMarkdownBody(content.body)),
    comments: content._count.comments,
    saves: content._count.bookmarks,
    accent: contentTypeAccent[type]
  };
}

function readMarkdownBody(body: unknown) {
  if (
    body &&
    typeof body === "object" &&
    "markdown" in body &&
    typeof body.markdown === "string"
  ) {
    return body.markdown;
  }

  return "";
}

function estimateReadTime(text: string) {
  const minutes = Math.max(1, Math.ceil(text.length / 500));
  return `${minutes} min`;
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("zh-CN", {
    month: "short",
    day: "numeric"
  }).format(date);
}

function calculateNodePosition(index: number, total: number) {
  if (total <= 1) {
    return { x: 50, y: 50 };
  }

  if (index === 0) {
    return { x: 50, y: 50 };
  }

  const ringIndex = index - 1;
  const angle = (ringIndex / Math.max(1, total - 1)) * Math.PI * 2 - Math.PI / 2;
  const radiusX = total > 10 ? 37 : 32;
  const radiusY = total > 10 ? 34 : 29;
  const wobble = ringIndex % 2 === 0 ? 4 : -3;

  return {
    x: clamp(Math.round(50 + Math.cos(angle) * (radiusX + wobble)), 22, 78),
    y: clamp(Math.round(50 + Math.sin(angle) * (radiusY - wobble)), 20, 80)
  };
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}
