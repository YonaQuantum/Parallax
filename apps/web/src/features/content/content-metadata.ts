import {
  BookOpen,
  Code2,
  FileText,
  PlaySquare,
  type LucideIcon
} from "lucide-react";

export type ContentType = "article" | "doc" | "video" | "note";

export type ContentItem = {
  slug: string;
  title: string;
  excerpt: string;
  type: ContentType;
  tag: string;
  author: string;
  authorHandle: string;
  publishedAt: string;
  publishedAtDate: Date;
  readTime: string;
  comments: number;
  saves: number;
  accent: string;
};

export const contentTypeLabel: Record<ContentType, string> = {
  article: "文章",
  doc: "文档",
  video: "视频",
  note: "图文"
};

export const contentTypeIcon: Record<ContentType, LucideIcon> = {
  article: BookOpen,
  doc: FileText,
  video: PlaySquare,
  note: Code2
};

export const contentTypeAccent: Record<ContentType, string> = {
  article: "#de6b48",
  doc: "#315c4b",
  video: "#efb44b",
  note: "#5b7f95"
};
