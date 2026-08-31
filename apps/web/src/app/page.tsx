import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { site } from "@/config/site";
import { getWorldSignals, type WorldSignal } from "@/features/radar/queries";
import { contentTypeLabel } from "@/features/content/content-metadata";
import { getPublishedContentFeed } from "@/features/content/queries";
import {
  domains,
  HeroUniverse,
  MainHeader,
  SpaceBackdrop
} from "@/features/interface/chrome";
import { DepthDeck } from "@/features/interface/depth-deck";
import { HeroScrollFrame } from "@/features/interface/hero-scroll-frame";
import {
  NewSignalBoard,
  type SignalBoardItem
} from "@/features/interface/new-signal-board";

export const dynamic = "force-dynamic";

export default async function Home() {
  const [signals, feed] = await Promise.all([
    getWorldSignals({ balanced: true, requireLocalized: true, take: 18 }),
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
      <NewSignalBoard items={items} />
    </section>
  );
}

function buildNewItems(
  signals: WorldSignal[],
  feed: Awaited<ReturnType<typeof getPublishedContentFeed>>
): SignalBoardItem[] {
  const signalItems = signals.map((signal) => ({
    id: signal.id,
    kind: "signal" as const,
    createdAt: signal.createdAt,
    href: signal.href ?? "/map",
    meta: `${signal.time} / ${signal.phase} / ${signal.domain}`,
    title: signal.title,
    summary: signal.summary,
    source: signal.source,
    tags: signal.tags,
    thumbnailUrl: signal.thumbnailUrl,
    external: Boolean(signal.href)
  }));
  const communityItems = feed.slice(0, 6).map((content) => ({
    id: `content-${content.slug}`,
    kind: "community" as const,
    createdAt: content.publishedAtDate,
    href: `/content/${content.slug}`,
    meta: `COMMUNITY / ${contentTypeLabel[content.type]} / ${content.publishedAt}`,
    title: content.title,
    summary: content.excerpt,
    source: content.author,
    tags: [content.tag],
    thumbnailUrl: null,
    external: false
  }));

  return [...signalItems, ...communityItems]
    .sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime())
    .slice(0, 18);
}
