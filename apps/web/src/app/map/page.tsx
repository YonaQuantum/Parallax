import Link from "next/link";
import Image from "next/image";
import { ArrowUpRight, Search } from "lucide-react";
import { site, type SiteDomainCode } from "@/config/site";
import { getWorldSignals, type WorldSignal } from "@/features/radar/queries";
import { SpaceBackdrop, SubHeader } from "@/features/interface/chrome";

export const dynamic = "force-dynamic";

export default async function ObservatoryPage({
  searchParams
}: {
  searchParams: Promise<{ domain?: string }>;
}) {
  const rawDomain = (await searchParams).domain;
  const domain = isSiteDomainCode(rawDomain) ? rawDomain : undefined;
  const signals = await getWorldSignals({ domain, take: 48 });
  const groups = groupSignalsByTimeline(signals);
  const domainLabel = domain ? site.copy.domains[domain].label : null;

  return (
    <main className="ap-shell">
      <SpaceBackdrop />
      <SubHeader backHref="/" backLabel={site.copy.brand.name} />

      <div className="ap-container py-14 sm:py-20">
        <section className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-end">
          <div>
            <h1 className="text-5xl font-semibold leading-none sm:text-7xl">
              {domainLabel ?? site.copy.sections.observatory}
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-white/60">
              {domainLabel
                ? `${domainLabel}领域的外部信号时间线，来自 Radar 摄入、筛选并公开。`
                : "展示 Radar 摄入、筛选并公开的外部信号，以及社区内部正在发生的新发布。"}
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
          <SectionHead
            title={domainLabel ? `${domainLabel} · 信号` : site.copy.sections.signals}
          />
          {groups.length > 0 ? (
            groups.map((group) => (
              <div className="mt-10" key={group.label}>
                <h2 className="text-xs font-medium tracking-[0.2em] text-white/34">{group.label}</h2>
                <div className="mt-4 divide-y divide-white/[0.06]">
                  {group.signals.map((signal) => (
                    <SignalRow key={signal.id} signal={signal} />
                  ))}
                </div>
              </div>
            ))
          ) : (
            <p className="mt-6 max-w-xl text-sm leading-6 text-white/48">暂无公开观测信号。</p>
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

function SignalRow({ signal }: { signal: WorldSignal }) {
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
          <span className="mt-2 block max-w-3xl text-sm leading-6 text-white/52">{signal.summary}</span>
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
      rel="noreferrer"
      target="_blank"
    >
      {signal.thumbnailUrl ? <SignalBackdropImage signal={signal} /> : null}
      {content}
    </a>
  ) : (
    <article
      className={`ap-observatory-row group grid gap-3 py-6 sm:grid-cols-[1fr_auto] ${signal.thumbnailUrl ? "ap-observatory-row-with-media" : ""}`}
    >
      {signal.thumbnailUrl ? <SignalBackdropImage signal={signal} /> : null}
      {content}
    </article>
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

const DAY_MS = 86_400_000;

function groupSignalsByTimeline(signals: WorldSignal[]) {
  const groups: Array<{ label: string; signals: WorldSignal[] }> = [];
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const startOfYesterday = startOfToday - DAY_MS;
  const startOfWeek = startOfToday - 6 * DAY_MS;

  for (const signal of signals) {
    const time = signal.createdAt.getTime();
    const label =
      time >= startOfToday
        ? "今天"
        : time >= startOfYesterday
          ? "昨天"
          : time >= startOfWeek
            ? "本周"
            : "更早";

    let group = groups.find((item) => item.label === label);
    if (!group) {
      group = { label, signals: [] };
      groups.push(group);
    }
    group.signals.push(signal);
  }

  return groups;
}

function isSiteDomainCode(value: string | undefined): value is SiteDomainCode {
  return (
    value === "CODE" ||
    value === "AI_MODELS" ||
    value === "GAME_INTERACTION" ||
    value === "HARDWARE_EMBEDDED" ||
    value === "CREATIVE_MEDIA" ||
    value === "SCIENCE_COSMOS"
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
