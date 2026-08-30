"use client";

import Link from "next/link";
import { ArrowRight, Bot, BookOpen, Cpu, Gamepad2, Music2, RadioTower } from "lucide-react";
import type { CSSProperties } from "react";
import { useEffect, useMemo, useState } from "react";
import { site } from "@/config/site";
import type { SiteDomainCode } from "@/config/site";

type DeckDomain = {
  code: SiteDomainCode;
  href: string;
  shortCode: string;
  label: string;
  description: string;
  tags: string[];
  examples: string[];
};

const cycleMs = 42000;

export function DepthDeck({ domains }: { domains: DeckDomain[] }) {
  const [phase, setPhase] = useState(0);
  const count = domains.length;
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    if (reducedMotion || count === 0) {
      return;
    }

    let frame = 0;
    let last = 0;
    const startedAt = performance.now();

    const tick = (now: number) => {
      if (now - last > 80) {
        const nextPhase = ((now - startedAt) / cycleMs) * count;
        setPhase(nextPhase % count);
        last = now;
      }
      frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [count, reducedMotion]);

  const cards = useMemo(
    () =>
      domains.map((domain, index) => {
        const depth = getDepth(index, phase, count);
        return {
          domain,
          depth,
          style: toDeckStyle(depth, count),
          active: depth < 0.48
        };
      }),
    [count, domains, phase]
  );

  return (
    <section className="ap-depth-section" aria-label="PARALLAX domains">
      <div className="mb-6 flex items-end justify-between gap-4">
        <div>
          <h2 className="text-sm font-medium text-white/42">{site.copy.sections.deck}</h2>
          <p className="mt-2 max-w-xl text-sm leading-6 text-white/42">
            {site.copy.sections.deckDescription}
          </p>
        </div>
        <span className="hidden font-mono text-xs text-white/28 sm:block">01 / 06</span>
      </div>
      <div className="ap-depth-deck">
        {cards.map(({ active, depth, domain, style }) => {
          const Icon = domainIcons[domain.code];
          return (
            <Link
              aria-current={active ? "true" : undefined}
              className="ap-depth-card"
              href={domain.href}
              key={domain.code}
              style={style}
            >
              <div className="flex items-start justify-between gap-6">
                <div>
                  <div className="font-mono text-xs text-white/34">{domain.shortCode}</div>
                  <h3 className="mt-4 text-4xl font-semibold leading-none text-white sm:text-6xl">
                    {domain.label}
                  </h3>
                </div>
                <Icon className="mt-1 text-white/48" size={32} />
              </div>
              <p className="mt-7 max-w-2xl text-sm leading-7 text-white/58 sm:text-base">
                {domain.description}
              </p>
              <div className="mt-7 flex flex-wrap gap-2">
                {domain.tags.map((tag) => (
                  <span className="bg-white/[0.055] px-3 py-1.5 text-xs text-white/58" key={tag}>
                    {tag}
                  </span>
                ))}
              </div>
              <div className="mt-8 grid gap-2 text-sm text-white/44 sm:grid-cols-3">
                {domain.examples.map((example) => (
                  <span className="border-t border-white/[0.08] pt-3" key={example}>
                    {example}
                  </span>
                ))}
              </div>
              <div className="absolute bottom-6 right-6 flex items-center gap-2 text-sm text-white/38">
                {String(Math.round(depth) + 1).padStart(2, "0")}
                <ArrowRight size={16} />
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}

function useReducedMotion() {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReduced(media.matches);
    sync();
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, []);

  return reduced;
}

function getDepth(index: number, phase: number, count: number) {
  if (count === 0) {
    return 0;
  }

  const base = Math.floor(phase);
  const fraction = phase - base;
  const slot = (index - base + count) % count;
  return slot === 0 ? fraction : slot - fraction;
}

function toDeckStyle(depth: number, count: number) {
  const clampedDepth = Math.min(count - 1, Math.max(0, depth));
  const progress = count <= 1 ? 0 : clampedDepth / (count - 1);
  const x = clampedDepth * 54;
  const y = clampedDepth * -38;
  const scale = 1 - clampedDepth * 0.046;
  const blur = Math.max(0, clampedDepth - 0.15) * 3.1;
  const opacity = Math.max(0.14, 1 - clampedDepth * 0.19);
  const zIndex = Math.round((count - clampedDepth) * 10);

  return {
    "--deck-progress": progress,
    filter: `blur(${blur.toFixed(2)}px)`,
    opacity,
    transform: `translate3d(${x.toFixed(2)}px, ${y.toFixed(2)}px, ${(-clampedDepth * 90).toFixed(2)}px) scale(${scale.toFixed(4)})`,
    zIndex
  } as CSSProperties;
}

const domainIcons = {
  CODE: BookOpen,
  AI_MODELS: Bot,
  GAME_INTERACTION: Gamepad2,
  HARDWARE_EMBEDDED: Cpu,
  CREATIVE_MEDIA: Music2,
  SCIENCE_COSMOS: RadioTower
};
