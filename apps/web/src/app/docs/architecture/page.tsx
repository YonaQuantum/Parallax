import Link from "next/link";
import { Blocks, Database, HardDrive, IdCard, Puzzle, ShieldCheck } from "lucide-react";
import { site } from "@/config/site";
import { SpaceBackdrop, SubHeader } from "@/features/interface/chrome";

const items = [
  {
    title: "真实数据",
    text: "首页、探索、观测台和个人页只读数据库。没有内容时展示空状态。",
    icon: Database,
    accent: "var(--yellow)"
  },
  {
    title: "本地存储",
    text: "上传文件优先落在本机磁盘，适配大容量存储和后续备份。",
    icon: HardDrive,
    accent: "var(--blue)"
  },
  {
    title: "AURA 身份",
    text: "月光卡和白卡进入账号体系，成员主页通过身份卡展开。",
    icon: IdCard,
    accent: "var(--purple)"
  },
  {
    title: "邮箱验证",
    text: "注册后必须验证邮箱才能登录，生产部署需要配置 SMTP。",
    icon: ShieldCheck,
    accent: "var(--red)"
  },
  {
    title: "内容块",
    text: "编辑器里的代码、视频、图表和实验记录会逐步插件化。",
    icon: Blocks,
    accent: "var(--blue)"
  },
  {
    title: "扩展系统",
    text: "插件 manifest 记录扩展槽、权限和状态，方便社区共建。",
    icon: Puzzle,
    accent: "var(--yellow)"
  }
];

export default function ArchitecturePage() {
  return (
    <main className="ap-shell">
      <SpaceBackdrop />
      <SubHeader backHref="/" backLabel="返回社区" title="BUILD THE BODY" />

      <div className="ap-container py-7">
        <section className="ap-frame ap-cut-deep p-5 sm:p-8">
          <div className="font-mono text-xs tracking-[0.22em] text-[var(--yellow)]">
            OPEN SOURCE BODY
          </div>
          <h1 className="mt-4 text-4xl font-semibold leading-tight sm:text-6xl">共建架构</h1>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-white/62">
            {site.copy.brand.name} 是社区本体，不只是社区页面。所有关键能力都要能被开源成员阅读、部署、扩展和替换。
          </p>
        </section>

        <section className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {items.map((item) => {
            const Icon = item.icon;
            return (
              <article className="ap-panel ap-cut min-h-[210px] p-5" key={item.title}>
                <div className="flex items-center justify-between">
                  <Icon size={23} style={{ color: item.accent }} />
                  <span className="h-3 w-16" style={{ background: item.accent }} />
                </div>
                <h2 className="mt-10 text-2xl font-semibold">{item.title}</h2>
                <p className="mt-3 text-sm leading-6 text-white/58">{item.text}</p>
              </article>
            );
          })}
        </section>

        <section className="ap-panel ap-cut-deep mt-6 p-5 sm:p-7">
          <h2 className="text-2xl font-semibold">当前需要优先补齐</h2>
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            {["SMTP 真实收信测试", "内容编辑和审核", "限流、备份和恢复演练"].map((item) => (
              <div className="border border-white/12 bg-black/24 p-4 text-sm text-white/62" key={item}>
                {item}
              </div>
            ))}
          </div>
          <Link className="ap-btn ap-btn-primary mt-6" href="/studio">
            去发布真实内容
          </Link>
        </section>
      </div>
    </main>
  );
}
