import Image from "next/image";
import { AuraCardVariant } from "@prisma/client";
import { BadgeCheck } from "lucide-react";
import type { AuraProfile } from "@/features/aura/queries";

type AuraCardProps = {
  profile: AuraProfile;
  compact?: boolean;
};

export function AuraCard({ profile, compact = false }: AuraCardProps) {
  const identity = profile.identity;
  const isMoon = identity?.cardVariant === AuraCardVariant.MOON;
  const avatar = identity?.avatarUrl ?? profile.user.image;
  const displayName = identity?.displayName ?? profile.user.name;
  const auraHandle = identity?.handle ?? profile.user.handle;
  const quote = identity?.quote ?? profile.user.bio;
  const skills = identity?.skills ?? [];

  return (
    <article
      className={`ap-cut-deep relative overflow-hidden border ${
        isMoon
          ? "border-white/28 bg-white/10 text-white"
          : "border-white/18 bg-white text-[#101217]"
      } ${compact ? "min-h-[310px]" : "min-h-[420px]"}`}
    >
      {isMoon && identity?.cardBackgroundUrl ? (
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-cover bg-center opacity-[0.68]"
          style={{ backgroundImage: `url(${identity.cardBackgroundUrl})` }}
        />
      ) : (
        <div className="absolute inset-0 bg-[linear-gradient(rgba(10,12,17,0.045)_1px,transparent_1px),linear-gradient(90deg,rgba(10,12,17,0.045)_1px,transparent_1px)] bg-[length:24px_24px]" aria-hidden="true" />
      )}

      <div
        className={`absolute inset-0 ${
          isMoon
            ? "bg-[linear-gradient(115deg,rgba(7,8,13,0.48),rgba(7,8,13,0.05)_46%,rgba(7,8,13,0.58))]"
            : "bg-[linear-gradient(120deg,rgba(255,255,255,0.94),rgba(255,255,255,0.72))]"
        }`}
        aria-hidden="true"
      />

      <div className="relative z-10 flex h-full min-h-[inherit] flex-col p-5 sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-sm font-semibold tracking-[0.18em]">
              <span>AURA</span>
              <span className={isMoon ? "text-white/26" : "text-black/30"}>|</span>
              <span>光环</span>
            </div>
            <div className={`mt-2 truncate font-mono text-xs ${isMoon ? "text-white/48" : "text-black/48"}`}>
              {identity?.serial ?? "AURA"} · {auraHandle}
            </div>
          </div>
          {identity?.isFounder ? (
            <span className="inline-flex shrink-0 items-center gap-1 border border-[var(--yellow)]/60 bg-[var(--yellow)] px-2.5 py-1 text-xs font-semibold text-[#07080d]">
              <BadgeCheck size={14} />
              月光卡
            </span>
          ) : (
            <span className="border border-black/12 bg-black/5 px-2.5 py-1 text-xs text-black/55">
              白卡
            </span>
          )}
        </div>

        <div className={`mt-8 flex ${compact ? "items-center gap-4" : "flex-col gap-5 sm:flex-row sm:items-center"}`}>
          <div className="ap-avatar relative size-24 shrink-0 overflow-hidden border border-white/42 bg-white/80 sm:size-28">
            {avatar ? (
              <Image
                alt={displayName}
                className="object-cover"
                fill
                sizes="112px"
                src={avatar}
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-2xl font-semibold text-black/45">
                {displayName.slice(0, 1).toUpperCase()}
              </div>
            )}
          </div>

          <div className="min-w-0">
            <h2 className={`${compact ? "text-2xl" : "text-3xl sm:text-4xl"} font-semibold leading-tight`}>
              {displayName}
            </h2>
            <div className={`mt-2 text-base ${isMoon ? "text-white/58" : "text-black/54"}`}>
              @{auraHandle}
            </div>
            {quote ? (
              <p className={`mt-4 line-clamp-3 text-sm leading-6 ${isMoon ? "text-white/62" : "text-black/62"}`}>
                {quote}
              </p>
            ) : null}
          </div>
        </div>

        <div className="mt-auto pt-6">
          <div className={`break-all font-mono text-lg font-semibold tracking-wide sm:text-2xl ${isMoon ? "text-white/54" : "text-black/38"}`}>
            {identity?.code ?? "UNCLAIMED"}
          </div>
          {skills.length > 0 ? (
            <div className="mt-4 flex flex-wrap gap-2">
              {skills.map((skill) => (
                <span
                  className={`border px-2.5 py-1 text-xs ${
                    isMoon
                      ? "border-white/16 bg-white/12 text-white/66"
                      : "border-black/10 bg-white/72 text-black/62"
                  }`}
                  key={skill}
                >
                  {skill}
                </span>
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </article>
  );
}
