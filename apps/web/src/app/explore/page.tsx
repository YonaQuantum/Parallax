import Link from "next/link";
import { ArrowUpRight, Search } from "lucide-react";
import { site } from "@/config/site";
import { getWorldSignals, type WorldSignal } from "@/features/radar/queries";
import { getPublishedContentFeed, getTopTags } from "@/features/content/queries";
import { DomainCard, domains, SpaceBackdrop, SubHeader } from "@/features/interface/chrome";

export const dynamic = "force-dynamic";

export default async function ExplorePage({
  searchParams
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const query = (await searchParams).q?.trim() ?? "";
  const [feed, tags, signals] = await Promise.all([
    getPublishedContentFeed({ query }),
    getTopTags(),
    query ? getWorldSignals({ query, take: 8 }) : Promise.resolve([])
  ]);

  return (
    <main className="ap-shell">
      <SpaceBackdrop />
      <SubHeader backHref="/" backLabel={site.copy.brand.name} />

      <div className="ap-container py-14 sm:py-20">
        <section className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-end">
          <div>
            <h1 className="text-5xl font-semibold leading-none sm:text-7xl">{site.copy.sections.explore}</h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-white/60">
              {site.copy.explorePage.intro}
            </p>
          </div>
          <form
            action="/explore"
            className="flex h-11 items-center gap-3 border-b border-white/[0.12] text-sm text-white/42 transition focus-within:border-white/28"
          >
            <Search size={16} />
            <input
              defaultValue={query}
              name="q"
              className="w-full bg-transparent outline-none placeholder:text-white/32"
              placeholder={site.copy.search.explorePlaceholder}
            />
          </form>
        </section>

        <section className="mt-14">
          <div className="ap-track">
            {domains.map((domain) => (
              <DomainCard domain={domain} key={domain.code} />
            ))}
          </div>
        </section>

        {query && signals.length > 0 ? <SignalResults signals={signals} /> : null}

        {feed.length > 0 || !query || signals.length === 0 ? (
        <section className="mt-16">
          <SectionHead actionHref="/studio" actionLabel={site.copy.nav.publish} title={query ? site.copy.sections.results : site.copy.sections.latest} />
          {feed.length > 0 ? (
            <div className="mt-5 divide-y divide-white/[0.06]">
              {feed.map((item) => (
                <Link
                  className="group grid gap-3 py-6 sm:grid-cols-[1fr_auto]"
                  href={`/content/${item.slug}`}
                  key={item.slug}
                >
                  <span>
                    <span className="text-xs text-white/34">{item.tag}</span>
                    <span className="mt-2 block text-2xl font-medium leading-8 group-hover:text-[var(--yellow)]">
                      {item.title}
                    </span>
                  </span>
                  <span className="flex items-center gap-2 self-end text-sm text-white/36 group-hover:text-white/60">
                    {item.comments} {site.copy.explorePage.commentCountSuffix}
                    <ArrowUpRight size={15} />
                  </span>
                </Link>
              ))}
            </div>
          ) : (
            <p className="mt-6 max-w-xl text-sm leading-6 text-white/48">
              {query && signals.length === 0 ? site.copy.explorePage.noQueryResults : site.copy.explorePage.noContent}
            </p>
          )}
        </section>
        ) : null}

        {tags.length > 0 ? (
          <section className="mt-14">
            <SectionHead title={site.copy.sections.tags} />
            <div className="mt-5 flex flex-wrap gap-2">
              {tags.map((tag) => (
                <Link
                  className="text-sm text-white/45 hover:text-[var(--yellow)]"
                  href="/explore"
                  key={tag.slug}
                >
                  #{tag.name}
                </Link>
              ))}
            </div>
          </section>
        ) : null}
      </div>
    </main>
  );
}

function SignalResults({ signals }: { signals: WorldSignal[] }) {
  return (
    <section className="mt-16">
      <SectionHead actionHref="/map" actionLabel={site.copy.sections.observatory} title={site.copy.sections.signals} />
      <div className="mt-5 grid gap-3 md:grid-cols-2">
        {signals.map((signal) => (
          <a
            className="ap-signal-card group block p-5"
            href={signal.href ?? "/map"}
            key={signal.id}
            rel="noreferrer"
            target={signal.href ? "_blank" : undefined}
          >
            <span className="font-mono text-xs text-white/34">
              {signal.time} / {signal.phase} / {signal.domain}
            </span>
            <span className="mt-3 block line-clamp-2 text-xl font-medium leading-7 group-hover:text-[var(--yellow)]">
              {signal.title}
            </span>
            <span className="mt-4 block text-xs text-white/34">{signal.source}</span>
          </a>
        ))}
      </div>
    </section>
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
