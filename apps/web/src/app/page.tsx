import Link from "next/link";
import Image from "next/image";
import { ArrowUpRight, Bookmark, MessageSquare } from "lucide-react";
import { site } from "@/config/site";
import { getWorldSignals, type WorldSignal } from "@/features/radar/queries";
import { contentTypeIcon, contentTypeLabel } from "@/features/content/content-metadata";
import { getPublishedContentFeed } from "@/features/content/queries";
import {
  domains,
  HeroUniverse,
  MainHeader,
  SpaceBackdrop
} from "@/features/interface/chrome";
import { DepthDeck } from "@/features/interface/depth-deck";
import { HeroScrollFrame } from "@/features/interface/hero-scroll-frame";

export const dynamic = "force-dynamic";

export default async function Home() {
  const [signals, feed] = await Promise.all([
    getWorldSignals({ balanced: true, take: 6 }),
    getPublishedContentFeed()
  ]);

  return (
    <main className="ap-shell">
      <SpaceBackdrop />
      <MainHeader />

      <HeroScrollFrame>
        <div className="ap-container">
          <HeroUniverse />

          <div className="ap-home-surface">
            {signals.length > 0 || feed.length > 0 ? (
              <NewFeed feed={feed} signals={signals} />
            ) : null}

            <DepthDeck
              domains={domains.map((domain) => ({
                ...domain,
                ...site.copy.domains[domain.code]
              }))}
            />
          </div>
        </div>
      </HeroScrollFrame>
    </main>
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

function NewFeed({
  feed,
  signals
}: {
  feed: Awaited<ReturnType<typeof getPublishedContentFeed>>;
  signals: WorldSignal[];
}) {
  const items = buildNewItems(signals, feed);

  return (
    <section className="ap-glass-band py-10">
      <SectionHead actionHref="/map" actionLabel={site.copy.sections.all} title={site.copy.sections.now} />
      <div className="mt-5 grid gap-3 md:grid-cols-2">
        {items.map((item) => {
          if (item.kind === "community") {
            const Icon = contentTypeIcon[item.content.type];
            return (
              <Link className="ap-signal-card group block p-5" href={`/content/${item.content.slug}`} key={item.id}>
                <div className="flex items-center justify-between gap-4 font-mono text-xs text-white/34">
                  <span className="inline-flex items-center gap-2">
                    <Icon size={14} />
                    COMMUNITY / {contentTypeLabel[item.content.type]}
                  </span>
                  <span>{item.content.publishedAt}</span>
                </div>
                <h2 className="mt-3 line-clamp-2 text-xl font-medium leading-7 group-hover:text-[var(--yellow)]">
                  {item.content.title}
                </h2>
                <p className="mt-3 line-clamp-2 text-sm leading-6 text-white/52">
                  {item.content.excerpt}
                </p>
                <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-white/34">
                  <span>{item.content.author}</span>
                  <span>/</span>
                  <span>{item.content.tag}</span>
                  <span className="ml-auto inline-flex items-center gap-3">
                    <span className="inline-flex items-center gap-1">
                      <MessageSquare size={13} />
                      {item.content.comments}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <Bookmark size={13} />
                      {item.content.saves}
                    </span>
                  </span>
                </div>
              </Link>
            );
          }

          const signal = item.signal;
          const content = (
            <>
              {signal.thumbnailUrl ? <SignalThumbnail signal={signal} /> : null}
              <div className="font-mono text-xs text-white/34">
                {signal.time} / {signal.phase} / {signal.domain}
              </div>
              <h2 className="mt-3 line-clamp-3 text-xl font-medium leading-7 group-hover:text-[var(--yellow)]">
                {signal.summary ?? signal.title}
              </h2>
              {signal.summary ? (
                <p className="mt-3 line-clamp-2 text-sm leading-6 text-white/52">
                  {signal.title}
                </p>
              ) : null}
              <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-white/34">
                <span>{signal.source}</span>
                {signal.tags.slice(0, 2).map((tag) => (
                  <span className="bg-white/[0.055] px-2 py-1" key={tag}>
                    {tag}
                  </span>
                ))}
              </div>
            </>
          );

          return signal.href ? (
            <a
              className={`ap-signal-card group block p-5 ${signal.thumbnailUrl ? "ap-signal-card-with-media" : ""}`}
              href={signal.href}
              key={item.id}
              rel="noreferrer"
              target="_blank"
            >
              {content}
            </a>
          ) : (
            <article
              className={`ap-signal-card group p-5 ${signal.thumbnailUrl ? "ap-signal-card-with-media" : ""}`}
              key={item.id}
            >
              {content}
            </article>
          );
        })}
      </div>
    </section>
  );
}

function SignalThumbnail({ signal }: { signal: WorldSignal }) {
  return (
    <span aria-hidden className="ap-signal-thumb">
      <Image
        alt=""
        fill
        referrerPolicy="no-referrer"
        sizes="(max-width: 720px) 72vw, 11rem"
        src={signal.thumbnailUrl ?? ""}
      />
    </span>
  );
}

function buildNewItems(
  signals: WorldSignal[],
  feed: Awaited<ReturnType<typeof getPublishedContentFeed>>
) {
  const signalItems = signals.map((signal) => ({
    id: signal.id,
    kind: "signal" as const,
    createdAt: signal.createdAt,
    signal
  }));
  const communityItems = feed.slice(0, 6).map((content) => ({
    id: `content-${content.slug}`,
    kind: "community" as const,
    createdAt: content.publishedAtDate,
    content
  }));

  return [...signalItems, ...communityItems]
    .sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime())
    .slice(0, 8);
}
