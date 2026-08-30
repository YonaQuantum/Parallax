import Link from "next/link";
import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import { BookOpen, CalendarDays, Code2, MessageSquare, RadioTower, Star } from "lucide-react";
import { AuraCard } from "@/features/aura/aura-card";
import { getProfileByHandle } from "@/features/aura/queries";
import { SpaceBackdrop, SubHeader } from "@/features/interface/chrome";

export const dynamic = "force-dynamic";

export default async function ProfilePage({
  params
}: {
  params: Promise<{ handle: string }>;
}) {
  const { handle } = await params;
  const profile = await getProfileByHandle(handle);

  if (!profile) {
    notFound();
  }

  return (
    <main className="ap-shell">
      <SpaceBackdrop />
      <SubHeader backHref="/members" backLabel="返回名册" title="MEMBER DOSSIER" />

      <div className="ap-container grid gap-6 py-7 lg:grid-cols-[minmax(0,1fr)_340px]">
        <section className="space-y-6">
          <AuraCard profile={profile} />

          <section className="ap-panel ap-cut p-5">
            <div className="flex items-center justify-between gap-4 border-b border-white/12 pb-3">
              <h2 className="text-xl font-semibold">发布记录</h2>
              <span className="font-mono text-xs text-white/38">
                {profile.user.contentCount} ITEMS
              </span>
            </div>
            {profile.contents.length > 0 ? (
              <div className="divide-y divide-white/10">
                {profile.contents.map((content) => (
                  <Link
                    className="block py-4 hover:text-[var(--yellow)]"
                    href={`/content/${content.slug}`}
                    key={content.slug}
                  >
                    <h3 className="font-semibold">{content.title}</h3>
                    {content.excerpt ? (
                      <p className="mt-2 line-clamp-2 text-sm leading-6 text-white/56">
                        {content.excerpt}
                      </p>
                    ) : null}
                  </Link>
                ))}
              </div>
            ) : (
              <p className="mt-4 border border-white/12 bg-black/24 p-4 text-sm text-white/52">
                暂无已发布内容。
              </p>
            )}
          </section>

          {profile.externalProjects.length > 0 ? (
            <section className="ap-panel ap-cut p-5">
              <div className="flex items-center justify-between gap-4 border-b border-white/12 pb-3">
                <h2 className="text-xl font-semibold">选中项目</h2>
                <span className="font-mono text-xs uppercase text-white/38">GitHub</span>
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {profile.externalProjects.map((project) => (
                  <a
                    className="group border border-white/10 bg-white/[0.035] p-4 hover:border-white/20"
                    href={project.url}
                    key={`${project.provider}-${project.fullName}`}
                    rel="noreferrer"
                    target="_blank"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <h3 className="font-mono text-sm font-semibold group-hover:text-[var(--yellow)]">
                        {project.fullName}
                      </h3>
                      <Code2 className="text-white/36" size={16} />
                    </div>
                    {project.description ? (
                      <p className="mt-3 line-clamp-2 text-sm leading-6 text-white/54">
                        {project.description}
                      </p>
                    ) : null}
                    <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-white/38">
                      {project.language ? <span>{project.language}</span> : null}
                      {typeof project.stars === "number" ? (
                        <span className="inline-flex items-center gap-1">
                          <Star size={13} />
                          {project.stars}
                        </span>
                      ) : null}
                    </div>
                  </a>
                ))}
              </div>
            </section>
          ) : null}
        </section>

        <aside className="space-y-5">
          <section className="ap-panel ap-cut p-5">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <RadioTower className="text-[var(--yellow)]" size={17} />
              档案遥测
            </div>
            <div className="mt-4 space-y-3 text-sm text-white/62">
              <Metric icon={<BookOpen size={16} />} label="内容" value={profile.user.contentCount} />
              <Metric
                icon={<MessageSquare size={16} />}
                label="评论"
                value={profile.user.commentCount}
              />
              <Metric
                icon={<CalendarDays size={16} />}
                label="加入"
                value={formatDate(profile.user.createdAt)}
              />
            </div>
          </section>

          {profile.identity ? (
            <section className="border border-[var(--yellow)]/42 bg-[var(--yellow)] p-5 text-[#07080d] ap-cut">
              <h2 className="text-sm font-semibold">AURA IDENTITY</h2>
              <div className="mt-4 space-y-3 text-sm">
                <div className="flex items-center justify-between gap-3">
                  <span className="opacity-65">编号</span>
                  <span className="font-mono font-semibold">{profile.identity.serial}</span>
                </div>
                <div>
                  <span className="opacity-65">UUID</span>
                  <div className="mt-1 break-all font-mono font-semibold">
                    {profile.identity.code}
                  </div>
                </div>
                <div>
                  <span className="opacity-65">版本</span>
                  <div className="mt-1 break-all font-mono text-xs">
                    {profile.identity.generationVersion}
                  </div>
                </div>
              </div>
            </section>
          ) : null}
        </aside>
      </div>
    </main>
  );
}

function Metric({
  icon,
  label,
  value
}: {
  icon: ReactNode;
  label: string;
  value: number | string;
}) {
  return (
    <div className="flex items-center justify-between gap-3 border border-white/12 bg-white/6 p-3">
      <span className="flex items-center gap-2">
        {icon}
        {label}
      </span>
      <span className="font-mono text-white">{value}</span>
    </div>
  );
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "short",
    day: "numeric"
  }).format(date);
}
