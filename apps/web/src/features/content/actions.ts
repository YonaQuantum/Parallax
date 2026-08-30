"use server";

import { ContentStatus } from "@prisma/client";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { auth } from "@/server/auth";
import { prisma } from "@/server/db/prisma";
import { isAllowedMediaFile, saveLocalMedia } from "@/server/storage/local-media";
import { createTagSlug } from "@/server/tags";
import { createUniqueSlug } from "@/features/content/slug";
import { createContentSchema, parseTags } from "@/features/content/schemas";

export type ContentFormState = {
  ok: boolean;
  message: string;
};

const maxUploadBytes = 512 * 1024 * 1024;
const createCommentSchema = z.object({
  contentSlug: z.string().trim().min(1),
  body: z.string().trim().min(1, "评论不能为空").max(4000, "评论不能超过 4000 个字符")
});

export async function createContentAction(
  _previousState: ContentFormState,
  formData: FormData
): Promise<ContentFormState> {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login");
  }

  const parsed = createContentSchema.safeParse({
    title: formData.get("title"),
    excerpt: formData.get("excerpt") || undefined,
    body: formData.get("body"),
    type: formData.get("type"),
    tags: formData.get("tags") || undefined,
    videoUrl: formData.get("videoUrl") || ""
  });

  if (!parsed.success) {
    return {
      ok: false,
      message: parsed.error.issues[0]?.message ?? "内容信息无效"
    };
  }

  const upload = formData.get("media");

  if (upload instanceof File && upload.size > maxUploadBytes) {
    return {
      ok: false,
      message: "上传文件不能超过 512MB"
    };
  }

  if (upload instanceof File && upload.size > 0 && !isAllowedMediaFile(upload)) {
    return {
      ok: false,
      message: "目前只支持图片、MP4/WebM 视频和 PDF"
    };
  }

  const { title, excerpt, body, type, tags, videoUrl } = parsed.data;
  const tagNames = parseTags(tags);
  const slug = await createUniqueSlug(title, async (candidate) => {
    const existing = await prisma.content.findUnique({
      where: { slug: candidate },
      select: { id: true }
    });

    return Boolean(existing);
  });

  const mediaPayload = upload instanceof File && upload.size > 0 ? await saveLocalMedia(upload) : null;

  const content = await prisma.content.create({
    data: {
      slug,
      title,
      excerpt,
      type,
      status: ContentStatus.PUBLISHED,
      publishedAt: new Date(),
      bodyFormat: "MARKDOWN",
      body: {
        markdown: body
      },
      videoUrl: videoUrl || undefined,
      coverImage: mediaPayload?.publicUrl,
      authorId: session.user.id,
      tags: {
        create: tagNames.map((name) => ({
          tag: {
            connectOrCreate: {
              where: { slug: createTagSlug(name) },
              create: {
                slug: createTagSlug(name),
                name
              }
            }
          }
        }))
      },
      media: mediaPayload
        ? {
            create: {
              ...mediaPayload,
              provider: "LOCAL",
              uploaderId: session.user.id
            }
          }
        : undefined
    },
    select: {
      slug: true
    }
  });

  redirect(`/content/${content.slug}`);
}

export async function createCommentAction(
  _previousState: ContentFormState,
  formData: FormData
): Promise<ContentFormState> {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login");
  }

  const parsed = createCommentSchema.safeParse({
    contentSlug: formData.get("contentSlug"),
    body: formData.get("body")
  });

  if (!parsed.success) {
    return {
      ok: false,
      message: parsed.error.issues[0]?.message ?? "评论信息无效"
    };
  }

  const content = await prisma.content.findUnique({
    where: { slug: parsed.data.contentSlug },
    select: { id: true }
  });

  if (!content) {
    return {
      ok: false,
      message: "内容不存在"
    };
  }

  await prisma.comment.create({
    data: {
      body: parsed.data.body,
      contentId: content.id,
      authorId: session.user.id
    }
  });

  revalidatePath(`/content/${parsed.data.contentSlug}`);

  return {
    ok: true,
    message: "评论已发布"
  };
}
