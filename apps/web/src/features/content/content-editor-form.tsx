"use client";

import { useActionState } from "react";
import {
  FileText,
  ImagePlus,
  ListChecks,
  PlaySquare,
  Send,
  StickyNote
} from "lucide-react";
import { ContentType } from "@prisma/client";
import { createContentAction, type ContentFormState } from "@/features/content/actions";

const initialState: ContentFormState = {
  ok: false,
  message: ""
};

const contentTypes = [
  { value: ContentType.ARTICLE, label: "文章", icon: FileText },
  { value: ContentType.DOC, label: "文档", icon: ListChecks },
  { value: ContentType.VIDEO, label: "视频", icon: PlaySquare },
  { value: ContentType.NOTE, label: "图文", icon: StickyNote }
];

export function ContentEditorForm() {
  const [state, formAction, pending] = useActionState(createContentAction, initialState);

  return (
    <form action={formAction} className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
      <section className="ap-panel ap-cut-deep p-4 sm:p-6">
        <div className="flex flex-wrap gap-2">
          {contentTypes.map((item, index) => {
            const Icon = item.icon;

            return (
              <label
                className="ap-cut flex h-10 cursor-pointer items-center gap-2 border border-white/12 bg-white/6 px-3 text-sm text-white/62 has-[:checked]:border-[var(--yellow)] has-[:checked]:bg-[var(--yellow)] has-[:checked]:font-semibold has-[:checked]:text-[#07080d]"
                key={item.value}
              >
                <input
                  className="sr-only"
                  defaultChecked={index === 0}
                  name="type"
                  type="radio"
                  value={item.value}
                />
                <Icon size={16} />
                {item.label}
              </label>
            );
          })}
        </div>

        <input
          className="mt-6 w-full border-0 border-b border-white/12 bg-transparent px-0 py-3 text-4xl font-semibold outline-none placeholder:text-white/24"
          name="title"
          placeholder="标题"
          required
        />
        <textarea
          className="ap-input mt-5 min-h-[420px] w-full resize-y p-4 leading-7"
          name="body"
          placeholder="写下正文、代码片段、视频链接或实验记录。"
          required
        />
      </section>

      <aside className="space-y-5">
        <section className="ap-panel ap-cut p-4">
          <h2 className="text-sm font-semibold">发布设置</h2>
          <div className="mt-4 space-y-4">
            <label className="block text-sm">
              <span className="text-white/55">标签</span>
              <input
                className="ap-input mt-2 h-10 w-full px-3"
                name="tags"
                placeholder="自托管, Next.js"
              />
            </label>
            <label className="block text-sm">
              <span className="text-white/55">摘要</span>
              <textarea
                className="ap-input mt-2 min-h-24 w-full resize-y p-3"
                name="excerpt"
                placeholder="一句话说明内容价值"
              />
            </label>
            <label className="block text-sm">
              <span className="text-white/55">视频链接</span>
              <input
                className="ap-input mt-2 h-10 w-full px-3"
                name="videoUrl"
                placeholder="https://..."
                type="url"
              />
            </label>
            <label className="block text-sm">
              <span className="text-white/55">封面或附件</span>
              <span className="ap-cut mt-2 flex min-h-28 cursor-pointer flex-col items-center justify-center border border-dashed border-white/24 bg-white/6 px-3 py-4 text-center text-sm text-white/50 hover:border-[var(--yellow)]">
                <ImagePlus className="mb-2 text-[var(--yellow)]" size={22} />
                图片、视频或 PDF，最大 512MB
                <input className="sr-only" name="media" type="file" />
              </span>
            </label>
          </div>
        </section>

        {state.message ? (
          <p className="border border-[var(--red)]/40 bg-[var(--red)]/10 px-3 py-2 text-sm text-[var(--red)]">
            {state.message}
          </p>
        ) : null}

        <button
          className="ap-btn ap-btn-primary w-full justify-center disabled:cursor-not-allowed disabled:opacity-60"
          disabled={pending}
        >
          <Send size={16} />
          {pending ? "发布中" : "发布"}
        </button>
      </aside>
    </form>
  );
}
