"use client";

import Link from "next/link";
import { useActionState } from "react";
import { LogIn, UserPlus } from "lucide-react";
import type { AuthFormState } from "@/features/auth/actions";
import { loginAction, registerAction } from "@/features/auth/actions";

const initialState: AuthFormState = {
  ok: false,
  message: ""
};

export function LoginForm() {
  const [state, formAction, pending] = useActionState(loginAction, initialState);

  return (
    <form action={formAction} className="mt-6 space-y-4">
      <label className="block text-sm">
        <span className="text-white/55">邮箱或用户名</span>
        <input
          className="ap-input mt-2 h-11 w-full px-3"
          name="email"
          autoComplete="username"
          required
        />
      </label>
      <label className="block text-sm">
        <span className="text-white/55">密码</span>
        <input
          className="ap-input mt-2 h-11 w-full px-3"
          name="password"
          type="password"
          autoComplete="current-password"
          required
        />
      </label>
      {state.message ? (
        <p className="border border-[var(--red)]/40 bg-[var(--red)]/10 px-3 py-2 text-sm text-[var(--red)]">
          {state.message}
        </p>
      ) : null}
      <button
        className="ap-btn ap-btn-primary w-full justify-center disabled:cursor-not-allowed disabled:opacity-60"
        disabled={pending}
      >
        <LogIn size={17} />
        {pending ? "登录中" : "登录"}
      </button>
      <p className="text-center text-sm text-white/52">
        还没有账号？{" "}
        <Link className="font-medium text-[var(--yellow)] hover:underline" href="/register">
          注册
        </Link>
      </p>
    </form>
  );
}

export function RegisterForm() {
  const [state, formAction, pending] = useActionState(registerAction, initialState);

  return (
    <form action={formAction} className="mt-6 space-y-4">
      <label className="block text-sm">
        <span className="text-white/55">昵称</span>
        <input
          className="ap-input mt-2 h-11 w-full px-3"
          name="name"
          autoComplete="name"
          required
        />
      </label>
      <label className="block text-sm">
        <span className="text-white/55">用户名</span>
        <input
          className="ap-input mt-2 h-11 w-full px-3"
          name="handle"
          autoComplete="username"
          required
        />
      </label>
      <label className="block text-sm">
        <span className="text-white/55">邮箱</span>
        <input
          className="ap-input mt-2 h-11 w-full px-3"
          name="email"
          type="email"
          autoComplete="email"
          required
        />
      </label>
      <label className="block text-sm">
        <span className="text-white/55">密码</span>
        <input
          className="ap-input mt-2 h-11 w-full px-3"
          name="password"
          type="password"
          autoComplete="new-password"
          minLength={8}
          required
        />
      </label>
      {state.message ? (
        <p className="border border-[var(--red)]/40 bg-[var(--red)]/10 px-3 py-2 text-sm text-[var(--red)]">
          {state.message}
        </p>
      ) : null}
      <button
        className="ap-btn ap-btn-primary w-full justify-center disabled:cursor-not-allowed disabled:opacity-60"
        disabled={pending}
      >
        <UserPlus size={17} />
        {pending ? "注册中" : "注册并验证邮箱"}
      </button>
      <p className="text-center text-sm text-white/52">
        已经有账号？{" "}
        <Link className="font-medium text-[var(--yellow)] hover:underline" href="/login">
          登录
        </Link>
      </p>
    </form>
  );
}
