import Link from "next/link";
import type { CSSProperties } from "react";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Bot,
  Cpu,
  FlaskConical,
  Gamepad2,
  LogIn,
  Music2,
  Plus,
  RadioTower,
  Search,
  Sparkles
} from "lucide-react";
import { site, type SiteDomainCode } from "@/config/site";

const domainCodes: SiteDomainCode[] = [
  "CODE",
  "AI_MODELS",
  "GAME_INTERACTION",
  "HARDWARE_EMBEDDED",
  "CREATIVE_MEDIA",
  "SCIENCE_COSMOS"
];

export const domains: Array<{ code: SiteDomainCode; href: string }> = domainCodes.map((code) => ({
  code,
  href: `/map?domain=${code}`
}));

const nav = [
  { href: "/explore", label: site.copy.nav.explore },
  { href: "/map", label: site.copy.nav.signals },
  { href: "/members", label: site.copy.nav.members },
  { href: "/docs/architecture", label: site.copy.nav.build }
];

export function SpaceBackdrop() {
  return <div className="ap-noise" aria-hidden="true" />;
}

export function MainHeader() {
  return (
    <header className="sticky top-0 z-30 mx-3 mt-2 border border-white/[0.10] bg-[#07080d]/72 shadow-[0_18px_80px_rgba(0,0,0,0.28)] backdrop-blur-2xl">
      <div className="flex h-16 items-center gap-5 px-5">
        <Link href="/" className="group flex items-center gap-3 font-semibold">
          <span className="flex size-9 items-center justify-center border border-white/18 bg-white/[0.055] text-sm text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.12)] group-hover:border-[var(--yellow)]">
            {site.copy.brand.logoText}
          </span>
          <span className="hidden text-lg tracking-[0.34em] sm:block">{site.copy.brand.name}</span>
        </Link>
        <nav className="hidden items-center gap-6 text-sm text-white/54 md:flex">
          {nav.map((item) => (
            <Link className="ap-nav-link" href={item.href} key={item.href}>
              {item.label}
            </Link>
          ))}
        </nav>
        <form
          action="/explore"
          className="ml-auto hidden h-10 w-full max-w-md items-center gap-2 border border-white/[0.08] bg-white/[0.035] px-3 text-sm text-white/42 transition focus-within:border-white/18 focus-within:bg-white/[0.055] lg:flex"
        >
          <Search size={15} />
          <input
            name="q"
            className="w-full bg-transparent outline-none placeholder:text-white/32"
            placeholder={site.copy.search.globalPlaceholder}
          />
        </form>
        <Link className="ml-auto inline-flex h-10 items-center gap-2 border border-white/[0.08] px-4 text-sm text-white/72 hover:border-white/18 hover:text-white md:ml-0" href="/login">
          <LogIn size={15} />
          {site.copy.nav.login}
        </Link>
        <Link className="ap-btn ap-btn-light hidden sm:inline-flex" href="/studio">
          <Plus size={16} />
          {site.copy.nav.publish}
        </Link>
      </div>
    </header>
  );
}

export function SubHeader({
  backHref = "/",
  backLabel = "返回",
  title
}: {
  backHref?: string;
  backLabel?: string;
  title?: string;
}) {
  return (
    <header className="border-b border-white/[0.06] bg-[#07080d]/82 backdrop-blur-2xl">
      <div className="ap-container flex h-16 items-center justify-between gap-4">
        <Link
          className="inline-flex items-center gap-2 text-sm font-medium text-white/64 hover:text-white"
          href={backHref}
        >
          <ArrowLeft size={17} />
          {backLabel}
        </Link>
        {title ? <div className="hidden text-xs tracking-[0.18em] text-white/30 sm:block">{title}</div> : null}
      </div>
    </header>
  );
}

export function HeroUniverse() {
  const haloClassName = site.theme.haloAsset ? "ap-halo ap-halo-fixed ap-halo-image" : "ap-halo ap-halo-fixed";
  const haloStyle = site.theme.haloAsset
    ? ({ "--halo-image": `url("${site.theme.haloAsset}")` } as CSSProperties)
    : undefined;

  return (
    <section className="ap-hero relative isolate min-h-[620px] overflow-hidden py-14 sm:min-h-[690px] sm:py-20">
      <div className="grid-pattern absolute inset-x-0 top-0 h-[72%] opacity-[0.07]" aria-hidden="true" />
      <div className="ap-hero-vignette absolute inset-0" aria-hidden="true" />
      <div className={haloClassName} style={haloStyle} />
      <div className="ap-liquid-glass ap-liquid-left absolute left-[9%] top-[25%] hidden h-24 w-60 lg:block" aria-hidden="true" />
      <div className="ap-liquid-glass ap-liquid-right absolute right-[13%] top-[33%] hidden h-44 w-52 lg:block" aria-hidden="true" />
      <div className="ap-horizon absolute inset-x-[6%] bottom-[17%] h-px" aria-hidden="true" />

      <div className="relative z-10 flex min-h-[510px] items-center pt-16 lg:pt-8">
        <div className="ap-hero-card max-w-xl p-5 sm:p-7 lg:p-8">
          <div className="ap-glass-chip inline-flex items-center gap-2 px-4 py-2 text-sm text-white/72">
            <span className="size-2 bg-white/70 shadow-[0_0_18px_rgba(238,245,255,0.75)]" />
            {site.copy.hero.eyebrow}
          </div>
          <h1 className="ap-hero-title mt-8 font-semibold uppercase leading-none tracking-[0.02em]">
            {site.copy.brand.name}
          </h1>
          <p className="mt-4 text-3xl font-light leading-tight text-white/70 sm:text-5xl">
            {site.copy.hero.headline}
          </p>
          <p className="mt-7 max-w-xl text-base leading-7 text-white/62 sm:text-lg sm:leading-8">
            {site.copy.hero.description.split("\n").map((line, index) => (
              <span key={`${index}-${line}`}>
                {index > 0 ? <br className="hidden sm:block" /> : null}
                {line}
              </span>
            ))}
          </p>
          <div className="mt-9 flex flex-wrap gap-4">
            <Link className="ap-btn ap-btn-light" href="/studio">
              {site.copy.hero.primaryAction}
              <Sparkles size={15} />
            </Link>
            <Link className="ap-btn ap-btn-ghost" href="/explore">
              {site.copy.hero.secondaryAction}
              <ArrowRight size={15} />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

export function DomainCard({ domain }: { domain: (typeof domains)[number] }) {
  const Icon = domainIcons[domain.code];
  const copy = site.copy.domains[domain.code];

  return (
    <Link
      className="group min-h-[210px] border border-white/[0.08] bg-white/[0.035] p-6 backdrop-blur-xl transition hover:border-white/18 hover:bg-white/[0.055]"
      href={domain.href}
    >
      <div className="flex items-center justify-between gap-4">
        <Icon size={30} className="text-white/62 group-hover:text-white" />
        <ArrowRight size={17} className="text-white/34 transition group-hover:translate-x-1 group-hover:text-[var(--yellow)]" />
      </div>
      <div className="mt-9 text-lg font-medium text-white">{copy.label}</div>
      <div className="mt-5 flex flex-wrap gap-2">
        {copy.tags.map((tag) => (
          <span className="bg-white/[0.055] px-3 py-1.5 text-xs text-white/54" key={tag}>
            {tag}
          </span>
        ))}
      </div>
    </Link>
  );
}

export const domainIcons = {
  CODE: BookOpen,
  AI_MODELS: Bot,
  GAME_INTERACTION: Gamepad2,
  HARDWARE_EMBEDDED: Cpu,
  CREATIVE_MEDIA: Music2,
  SCIENCE_COSMOS: RadioTower,
  GENERAL: FlaskConical
};
