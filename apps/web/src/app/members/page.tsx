import Link from "next/link";
import { Search } from "lucide-react";
import { site } from "@/config/site";
import { IdentityCard } from "@/features/identity/identity-card";
import { getMemberProfiles } from "@/features/identity/queries";
import { SpaceBackdrop, SubHeader } from "@/features/interface/chrome";

export const dynamic = "force-dynamic";

export default async function MembersPage() {
  const members = await getMemberProfiles();

  return (
    <main className="ap-shell">
      <SpaceBackdrop />
      <SubHeader backHref="/" backLabel={site.copy.brand.name} />

      <div className="ap-container py-14 sm:py-20">
        <section className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-end">
          <div>
            <h1 className="text-5xl font-semibold leading-none sm:text-7xl">身份卡</h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-white/60">
              社区成员的公开身份。
            </p>
          </div>
          <label className="flex h-11 items-center gap-3 border-b border-white/[0.12] text-sm text-white/42">
            <Search size={16} />
            <input
              className="w-full bg-transparent outline-none placeholder:text-white/32"
              placeholder="搜索成员"
            />
          </label>
        </section>

        {members.length > 0 ? (
          <section className="mt-14">
            <div className="ap-track">
              {members.map((profile) => (
                <Link
                  href={`/u/${profile.identity?.handle ?? profile.user.handle}`}
                  key={profile.user.id}
                >
                  <IdentityCard compact profile={profile} />
                </Link>
              ))}
            </div>
          </section>
        ) : (
          <p className="mt-14 text-sm text-white/48">暂无成员。</p>
        )}
      </div>
    </main>
  );
}
