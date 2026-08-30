import { ContentType } from "@prisma/client";
import { z } from "zod";

export const contentTypeValues = [
  ContentType.ARTICLE,
  ContentType.DOC,
  ContentType.VIDEO,
  ContentType.NOTE
] as const;

export const createContentSchema = z.object({
  title: z.string().trim().min(2, "标题至少 2 个字符").max(120, "标题不能超过 120 个字符"),
  excerpt: z.string().trim().max(240, "摘要不能超过 240 个字符").optional(),
  body: z.string().trim().min(1, "正文不能为空").max(120_000, "正文过长"),
  type: z.enum(contentTypeValues),
  tags: z.string().trim().max(200, "标签过长").optional(),
  videoUrl: z.string().trim().url("视频链接格式不正确").optional().or(z.literal(""))
});

export function parseTags(input?: string) {
  return Array.from(
    new Set(
      (input ?? "")
        .split(/[,，\s]+/)
        .map((tag) => tag.trim())
        .filter(Boolean)
        .slice(0, 8)
    )
  );
}
