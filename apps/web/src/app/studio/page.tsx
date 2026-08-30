import { redirect } from "next/navigation";
import { auth } from "@/server/auth";
import { ContentEditorForm } from "@/features/content/content-editor-form";
import { SpaceBackdrop, SubHeader } from "@/features/interface/chrome";

export default async function StudioPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login");
  }

  return (
    <main className="ap-shell">
      <SpaceBackdrop />
      <SubHeader backHref="/" backLabel="返回社区" title="STUDIO / PUBLISH" />

      <div className="ap-container py-7">
        <section className="ap-frame ap-cut-deep mb-6 p-5 sm:p-8">
          <div className="font-mono text-xs tracking-[0.22em] text-[var(--yellow)]">
            LOCAL FIRST STUDIO
          </div>
          <h1 className="mt-4 text-4xl font-semibold leading-tight sm:text-6xl">创作台</h1>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-white/62">
            写文档、发视频、放图文、记录实验。发布后立即进入真实内容流。
          </p>
        </section>
        <ContentEditorForm />
      </div>
    </main>
  );
}
