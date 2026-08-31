"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import type { CSSProperties } from "react";
import { useEffect, useMemo, useState } from "react";

export type SignalBoardItem = {
  id: string;
  kind: "signal" | "community";
  href: string;
  meta: string;
  title: string;
  summary: string | null;
  source: string;
  tags: string[];
  thumbnailUrl: string | null;
  external: boolean;
};

const slotCount = 6;
const durationMs = 10_000;
const flipMs = 620;
const switchAtMs = 310;
const initialDelays = [2400, 0, 3000, 700, 3600, 1400];

export function NewSignalBoard({ items }: { items: SignalBoardItem[] }) {
  const slots = useMemo(() => items.slice(0, slotCount), [items]);

  if (slots.length === 0) {
    return null;
  }

  return (
    <div className="mt-5 grid gap-3 md:grid-cols-2">
      {slots.map((item, index) => (
        <SignalSlot
          index={index}
          items={items}
          key={`${index}-${item.id}`}
        />
      ))}
    </div>
  );
}

function SignalSlot({
  index,
  items
}: {
  index: number;
  items: SignalBoardItem[];
}) {
  const [cycle, setCycle] = useState(0);
  const [flipping, setFlipping] = useState(false);
  const [held, setHeld] = useState(false);
  const [progressKey, setProgressKey] = useState(0);
  const item = items[(index + cycle) % items.length];
  const nextItem = items[(index + cycle + slotCount) % items.length];
  const activeItem = flipping && nextItem ? nextItem : item;
  const canFlip = items.length > slotCount;
  const firstDelay = progressKey === 0 ? initialDelays[index] ?? 0 : 0;

  useEffect(() => {
    if (held || !canFlip) {
      return;
    }

    let switchTimer: number | undefined;
    let doneTimer: number | undefined;
    const timer = window.setTimeout(() => {
      setFlipping(true);
      switchTimer = window.setTimeout(() => {
        setCycle((value) => value + slotCount);
      }, switchAtMs);
      doneTimer = window.setTimeout(() => {
        setFlipping(false);
        setProgressKey((value) => value + 1);
      }, flipMs);
    }, durationMs + firstDelay);

    return () => {
      window.clearTimeout(timer);
      if (switchTimer) {
        window.clearTimeout(switchTimer);
      }
      if (doneTimer) {
        window.clearTimeout(doneTimer);
      }
    };
  }, [canFlip, firstDelay, held, progressKey]);

  const content = <SignalPanel item={activeItem} />;
  const className = [
    "ap-signal-card",
    "ap-signal-flip-card",
    "group",
    "block",
    "p-5",
    activeItem.thumbnailUrl ? "ap-signal-card-with-media" : "",
    flipping ? "is-flipping" : "",
    held ? "is-held" : ""
  ].filter(Boolean).join(" ");
  const style = {
    "--signal-duration": `${durationMs}ms`,
    "--signal-delay": `${firstDelay}ms`
  } as CSSProperties;

  const resetAndHold = () => {
    setHeld(true);
    setProgressKey((value) => value + 1);
  };
  const resumeFromZero = () => {
    setHeld(false);
    setProgressKey((value) => value + 1);
  };

  return item.external ? (
    <a
      className={className}
      href={item.href}
      onMouseEnter={resetAndHold}
      onMouseLeave={resumeFromZero}
      rel="noreferrer"
      style={style}
      target="_blank"
    >
      <span className="ap-signal-flip-inner">{content}</span>
      {canFlip ? <span className="ap-signal-progress" key={progressKey} /> : null}
    </a>
  ) : (
    <Link
      className={className}
      href={item.href}
      onMouseEnter={resetAndHold}
      onMouseLeave={resumeFromZero}
      style={style}
    >
      <span className="ap-signal-flip-inner">{content}</span>
      {canFlip ? <span className="ap-signal-progress" key={progressKey} /> : null}
    </Link>
  );
}

function SignalPanel({ item }: { item: SignalBoardItem }) {
  return (
    <>
      {item.thumbnailUrl ? <SignalThumbnail item={item} /> : null}
      <div className="font-mono text-xs text-white/34">
        {item.meta}
      </div>
      <h2 className="mt-3 line-clamp-3 text-xl font-medium leading-7 group-hover:text-[var(--yellow)]">
        {item.title}
      </h2>
      {item.summary ? (
        <p className="mt-3 line-clamp-2 text-sm leading-6 text-white/52">
          {item.summary}
        </p>
      ) : null}
      <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-white/34">
        <span>{item.source}</span>
        {item.tags.slice(0, 2).map((tag) => (
          <span className="bg-white/[0.055] px-2 py-1" key={tag}>
            {tag}
          </span>
        ))}
        {item.external ? <ArrowUpRight className="ml-auto" size={14} /> : null}
      </div>
    </>
  );
}

function SignalThumbnail({ item }: { item: SignalBoardItem }) {
  return (
    <span aria-hidden className="ap-signal-thumb">
      <Image
        alt=""
        fill
        referrerPolicy="no-referrer"
        sizes="(max-width: 720px) 72vw, 22rem"
        src={item.thumbnailUrl ?? ""}
        unoptimized
      />
    </span>
  );
}
