import Link from "next/link";
import Image from "next/image";
import { ArrowUpRight, Search } from "lucide-react";
import { site } from "@/config/site";
import { getWorldSignals, type WorldSignal } from "@/features/radar/queries";
import { SpaceBackdrop, SubHeader } from "@/features/interface/chrome";

export const dynamic = "force-dynamic";

export default async function ObservatoryPage() {
  const signals = await getWorldSignals({ take: 24 });

  return (
    <main className="ap-shell">
      <SpaceBackdrop />
      <SubHeader backHref="/" backLabel={site.copy.brand.name} />

      <div className="ap-container py-14 sm:py-20">
        <section className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-end">
          <div>
            <h1 className="text-5xl font-semibold leading-none sm:text-7xl">{site.copy.sections.observatory}</h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-white/60">
              展示 Radar 摄入、筛选并公开的外部信号，以及社区内部正在发生的新发布。
            </p>
          </div>
          <label className="flex h-11 items-center gap-3 border-b border-white/[0.12] text-sm text-white/42">
            <Search size={16} />
            <input
              className="w-full bg-transparent outline-none placeholder:text-white/32"
              placeholder="搜索观测项"
            />
          </label>
        </section>

        <section className="mt-16">
          <SectionHead title={site.copy.sections.signals} />
          {signals.length > 0 ? (
            <div className="mt-5 divide-y divide-white/[0.06]">
              {signals.map((signal) => {
                const content = (
                  <>
                    <span>
                      <span className="font-mono text-xs text-white/34">
                        {signal.time} / {signal.phase} / {signal.domain}
                      </span>
                      <span className="mt-2 block text-2xl font-medium leading-8 group-hover:text-[var(--yellow)]">
                        {signal.title}
                      </span>
                      {signal.summary ? (
                        <span className="mt-2 block max-w-3xl text-sm leading-6 text-white/52">
                          {signal.summary}
                        </span>
                      ) : null}
                    </span>
                    <span className="flex items-center gap-2 self-end text-sm text-white/36 group-hover:text-white/60">
                      {signal.source}
                      <ArrowUpRight size={15} />
                    </span>
                  </>
                );

                return signal.href ? (
                  <a
                    className={`ap-observatory-row group grid gap-3 py-6 sm:grid-cols-[1fr_auto] ${signal.thumbnailUrl ? "ap-observatory-row-with-media" : ""}`}
                    href={signal.href}
                    key={signal.id}
                    rel="noreferrer"
                    target="_blank"
                  >
                    {signal.thumbnailUrl ? <SignalBackdropImage signal={signal} /> : null}
                    {content}
                  </a>
                ) : (
                  <article
                    className={`ap-observatory-row group grid gap-3 py-6 sm:grid-cols-[1fr_auto] ${signal.thumbnailUrl ? "ap-observatory-row-with-media" : ""}`}
                    key={signal.id}
                  >
                    {signal.thumbnailUrl ? <SignalBackdropImage signal={signal} /> : null}
                    {content}
                  </article>
                );
              })}
            </div>
          ) : (
            <p className="mt-6 max-w-xl text-sm leading-6 text-white/48">
              暂无公开观测信号。
            </p>
          )}
        </section>

        <section className="mt-16 max-w-2xl">
          <SectionHead actionHref="/docs/architecture" actionLabel="接口" title="Radar" />
          <p className="mt-5 text-sm leading-7 text-white/48">
            Radar 可由独立工作站运行，通过主站 API 写入 GitHub、AI、游戏、光谱科学、宇宙生命和哲学探索资料。
          </p>
        </section>
      </div>
    </main>
  );
}

function SignalBackdropImage({ signal }: { signal: WorldSignal }) {
  return (
    <span aria-hidden className="ap-signal-thumb ap-signal-thumb-row">
      <Image
        alt=""
        fill
        referrerPolicy="no-referrer"
        sizes="(max-width: 720px) 70vw, 24rem"
        src={signal.thumbnailUrl ?? ""}
        unoptimized
      />
    </span>
  );
}

function SectionHead({
  actionHref,
  actionLabel,
  title
}: {
  actionHref?: string;
  actionLabel?: string;
  title: string;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <h2 className="text-sm font-medium text-white/42">{title}</h2>
      {actionHref && actionLabel ? (
        <Link className="inline-flex items-center gap-1.5 text-sm text-white/42 hover:text-white" href={actionHref}>
          {actionLabel}
          <ArrowUpRight size={14} />
        </Link>
      ) : null}
    </div>
  );
}
