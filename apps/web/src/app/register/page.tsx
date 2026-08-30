import { RegisterForm } from "@/features/auth/auth-form";
import { site } from "@/config/site";
import { SpaceBackdrop, SubHeader } from "@/features/interface/chrome";

export default function RegisterPage() {
  return (
    <main className="ap-shell">
      <SpaceBackdrop />
      <SubHeader backHref="/" backLabel="返回社区" title="IDENTITY ENROLLMENT" />
      <section className="ap-container flex min-h-[calc(100vh-4rem)] items-center justify-center py-8">
        <div className="ap-frame ap-cut-deep w-full max-w-md p-5 sm:p-7">
          <div className="font-mono text-xs tracking-[0.22em] text-[var(--yellow)]">
            WHITE CARD ISSUANCE
          </div>
          <h1 className="mt-4 text-3xl font-semibold">{site.copy.auth.registerTitle}</h1>
          <p className="mt-3 text-sm leading-6 text-white/58">
            完成邮箱验证后，你会获得普通身份白卡，并可以发布内容、上传媒体、参与讨论。
          </p>
        <RegisterForm />
        </div>
      </section>
    </main>
  );
}
