import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

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

export function NewSignalBoard({ items }: { items: SignalBoardItem[] }) {
  const slots = items.slice(0, slotCount);

  if (slots.length === 0) {
    return null;
  }

  return (
    <div className="mt-5 grid gap-3 md:grid-cols-2">
      {slots.map((item) => (
        <SignalCard
          item={item}
          key={item.id}
        />
      ))}
    </div>
  );
}

function SignalCard({ item }: { item: SignalBoardItem }) {
  const className = [
    "ap-signal-card",
    "group",
    "block",
    "p-5",
    item.thumbnailUrl ? "ap-signal-card-with-media" : ""
  ].filter(Boolean).join(" ");

  return item.external ? (
    <a
      className={className}
      href={item.href}
      rel="noreferrer"
      target="_blank"
    >
      <SignalPanel item={item} />
    </a>
  ) : (
    <Link
      className={className}
      href={item.href}
    >
      <SignalPanel item={item} />
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
