import { LoginForm } from "@/features/auth/auth-form";
import { site } from "@/config/site";
import { SpaceBackdrop, SubHeader } from "@/features/interface/chrome";

export default async function LoginPage({
  searchParams
}: {
  searchParams: Promise<{ verified?: string }>;
}) {
  const { verified } = await searchParams;
  const notice =
    verified === "1"
      ? "邮箱验证完成，现在可以登录。"
      : verified === "invalid"
        ? "验证链接无效或已过期，请重新注册或联系站点管理员。"
        : verified === "missing"
          ? "验证链接缺少 token。"
          : "";

  return (
    <main className="ap-shell">
      <SpaceBackdrop />
      <SubHeader backHref="/" backLabel="返回社区" title="ACCESS GATE" />
      <section className="ap-container flex min-h-[calc(100vh-4rem)] items-center justify-center py-8">
        <div className="ap-frame ap-cut-deep w-full max-w-md p-5 sm:p-7">
          <div className="font-mono text-xs tracking-[0.22em] text-[var(--yellow)]">
            VERIFIED ACCESS
          </div>
          <h1 className="mt-4 text-3xl font-semibold">{site.copy.auth.loginTitle}</h1>
        {notice ? (
          <p className="mt-3 border border-[var(--yellow)]/40 bg-[var(--yellow)]/10 px-3 py-2 text-sm text-[var(--yellow)]">
            {notice}
          </p>
        ) : null}
        <LoginForm />
        </div>
      </section>
    </main>
  );
}
