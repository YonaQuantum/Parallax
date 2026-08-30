import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Bookmark, MessageSquare, Share2, ThumbsUp } from "lucide-react";
import { contentTypeLabel } from "@/features/content/content-metadata";
import { CommentForm } from "@/features/content/comment-form";
import { getPublishedContentBySlug } from "@/features/content/queries";
import { SpaceBackdrop, SubHeader } from "@/features/interface/chrome";

export const dynamic = "force-dynamic";

export default async function ContentPage({
  params
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const item = await getPublishedContentBySlug(slug);

  if (!item) {
    notFound();
  }

  return (
    <main className="ap-shell">
      <SpaceBackdrop />
      <SubHeader backHref="/" backLabel="返回社区" title="CONTENT DOSSIER" />

      <article className="ap-container grid gap-6 py-7 lg:grid-cols-[minmax(0,1fr)_320px]">
        <section className="ap-frame ap-cut-deep overflow-hidden">
          <div className="grid-pattern border-b border-white/12 p-5 sm:p-8">
            <div className="flex flex-wrap items-center gap-2 font-mono text-xs tracking-[0.18em] text-white/42">
              <span
                className="border px-2.5 py-1 font-semibold text-white"
                style={{ borderColor: item.accent, background: item.accent }}
              >
                {contentTypeLabel[item.type]}
              </span>
              <span>{item.tag}</span>
              <span>{item.publishedAt}</span>
            </div>
            <h1 className="mt-6 max-w-4xl text-4xl font-semibold leading-tight sm:text-6xl">
              {item.title}
            </h1>
            <p className="mt-5 max-w-3xl text-base leading-8 text-white/64">{item.excerpt}</p>
          </div>

          {item.coverImage ? (
            <div className="relative aspect-video w-full overflow-hidden border-b border-white/12">
              <Image alt="" className="object-cover" fill src={item.coverImage} />
            </div>
          ) : null}

          {item.videoUrl ? (
            <div className="border-b border-white/12 bg-black/24 p-5 text-sm text-white/62">
              <a className="font-semibold text-[var(--yellow)] hover:underline" href={item.videoUrl}>
                打开视频链接
              </a>
            </div>
          ) : null}

          <div className="prose prose-invert max-w-none whitespace-pre-wrap p-5 prose-headings:text-white prose-a:text-[var(--yellow)] sm:p-8">
            {item.body || item.excerpt}
          </div>
        </section>

        <aside className="space-y-5">
          <section className="ap-panel ap-cut p-5">
            <div className="font-mono text-xs tracking-[0.2em] text-white/38">AUTHOR</div>
            <Link className="mt-3 block text-xl font-semibold hover:text-[var(--yellow)]" href={`/u/${item.authorHandle}`}>
              {item.author}
            </Link>
            <div className="mt-4 grid grid-cols-2 gap-2 text-sm text-white/56">
              <Stat label="阅读" value={item.readTime} />
              <Stat label="讨论" value={item.comments} />
              <Stat label="收藏" value={item.saves} />
              <Stat label="类型" value={contentTypeLabel[item.type]} />
            </div>
          </section>

          <section className="ap-panel ap-cut p-5">
            <div className="grid grid-cols-3 gap-2">
              <button className="ap-btn ap-btn-ghost justify-center" title="收藏">
                <Bookmark size={17} />
              </button>
              <button className="ap-btn ap-btn-ghost justify-center" title="分享">
                <Share2 size={17} />
              </button>
              <button className="ap-btn ap-btn-ghost justify-center" title="参与">
                <ThumbsUp size={17} />
              </button>
            </div>
          </section>

          <section className="ap-panel ap-cut p-5">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-base font-semibold">讨论</h2>
                <p className="mt-1 text-sm text-white/45">{item.comments} 条评论</p>
              </div>
              <MessageSquare className="text-[var(--purple)]" size={20} />
            </div>
            <CommentForm contentSlug={item.slug} />
            <div className="mt-5 space-y-3">
              {item.commentList.map((comment) => (
                <article className="border border-white/12 bg-black/24 p-3" key={comment.id}>
                  <div className="flex items-center justify-between gap-3 text-sm">
                    <span className="font-medium">{comment.author}</span>
                    <span className="text-white/38">{comment.createdAt}</span>
                  </div>
                  <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-white/62">
                    {comment.body}
                  </p>
                </article>
              ))}
            </div>
          </section>
        </aside>
      </article>
    </main>
  );
}

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="border border-white/12 bg-white/6 p-3">
      <div className="text-xs text-white/38">{label}</div>
      <div className="mt-1 font-semibold text-white">{value}</div>
    </div>
  );
}
