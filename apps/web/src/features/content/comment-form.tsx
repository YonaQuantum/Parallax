"use client";

import { useActionState } from "react";
import { MessageSquare } from "lucide-react";
import { createCommentAction, type ContentFormState } from "@/features/content/actions";

const initialState: ContentFormState = {
  ok: false,
  message: ""
};

export function CommentForm({ contentSlug }: { contentSlug: string }) {
  const [state, formAction, pending] = useActionState(createCommentAction, initialState);

  return (
    <form action={formAction} className="mt-4 space-y-3">
      <input name="contentSlug" type="hidden" value={contentSlug} />
      <textarea
        className="ap-input min-h-28 w-full resize-y p-3 text-sm leading-6"
        name="body"
        placeholder="写下你的想法"
        required
      />
      <div className="flex items-center justify-between gap-3">
        {state.message ? (
          <p className={state.ok ? "text-sm text-[var(--yellow)]" : "text-sm text-[var(--red)]"}>
            {state.message}
          </p>
        ) : (
          <span />
        )}
        <button
          className="ap-btn ap-btn-primary disabled:cursor-not-allowed disabled:opacity-60"
          disabled={pending}
        >
          <MessageSquare size={16} />
          {pending ? "发布中" : "评论"}
        </button>
      </div>
    </form>
  );
}
