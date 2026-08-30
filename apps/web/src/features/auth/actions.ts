"use server";

import { compare, hash } from "bcryptjs";
import { redirect } from "next/navigation";
import { z } from "zod";
import { generateNextAuraSerial, generateUniqueAuraCode } from "@/features/aura/id";
import { sendAccountVerification } from "@/features/auth/email-verification";
import { createSession } from "@/server/auth";
import { prisma } from "@/server/db/prisma";

export type AuthFormState = {
  ok: boolean;
  message: string;
};

const registerSchema = z.object({
  name: z.string().trim().min(1, "请输入昵称").max(40, "昵称不能超过 40 个字符"),
  handle: z
    .string()
    .trim()
    .min(3, "用户名至少 3 个字符")
    .max(32, "用户名不能超过 32 个字符")
    .regex(/^[a-zA-Z0-9_]+$/, "用户名只能包含字母、数字和下划线"),
  email: z.string().trim().email("请输入有效邮箱").max(120, "邮箱过长"),
  password: z.string().min(8, "密码至少 8 位").max(128, "密码过长")
});

const loginSchema = z.object({
  email: z.string().trim().min(1, "请输入邮箱或用户名"),
  password: z.string().min(1, "请输入密码")
});

export async function registerAction(
  _previousState: AuthFormState,
  formData: FormData
): Promise<AuthFormState> {
  const parsed = registerSchema.safeParse({
    name: formData.get("name"),
    handle: formData.get("handle"),
    email: formData.get("email"),
    password: formData.get("password")
  });

  if (!parsed.success) {
    return {
      ok: false,
      message: parsed.error.issues[0]?.message ?? "注册信息无效"
    };
  }

  const { name, handle, password } = parsed.data;
  const email = parsed.data.email.toLowerCase();
  const existingUser = await prisma.user.findFirst({
    where: {
      OR: [{ handle }, { email }]
    },
    select: { id: true }
  });

  if (existingUser) {
    return {
      ok: false,
      message: "用户名或邮箱已经被注册"
    };
  }

  const [auraCode, auraSerial, passwordHash] = await Promise.all([
    generateUniqueAuraCode(),
    generateNextAuraSerial(),
    hash(password, 12)
  ]);

  const user = await prisma.user.create({
    data: {
      name,
      handle,
      email,
      passwordHash,
      auraIdentity: {
        create: {
          serial: auraSerial,
          code: auraCode,
          generationVersion: "aura-id-tool-v0",
          displayName: name,
          handle,
          skills: [],
          cardVariant: "WHITE",
          status: "CLAIMED"
        }
      }
    },
    select: {
      id: true,
      email: true,
      name: true,
      handle: true
    }
  });

  await sendAccountVerification({
    userId: user.id,
    email: user.email ?? email,
    name: user.name ?? user.handle
  });

  return {
    ok: true,
    message: "注册成功，请先完成邮箱验证后再登录"
  };
}

export async function loginAction(
  _previousState: AuthFormState,
  formData: FormData
): Promise<AuthFormState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password")
  });

  if (!parsed.success) {
    return {
      ok: false,
      message: parsed.error.issues[0]?.message ?? "登录信息无效"
    };
  }

  const identifier = parsed.data.email;
  const user = await prisma.user.findFirst({
    where: {
      OR: [{ email: identifier.toLowerCase() }, { handle: identifier }]
    },
    select: {
      id: true,
      passwordHash: true,
      emailVerified: true
    }
  });

  if (!user?.passwordHash || !user.emailVerified) {
    return {
      ok: false,
      message: "账号或密码不正确，或邮箱尚未验证"
    };
  }

  const passwordValid = await compare(parsed.data.password, user.passwordHash);

  if (!passwordValid) {
    return {
      ok: false,
      message: "账号或密码不正确，或邮箱尚未验证"
    };
  }

  await createSession(user.id);

  redirect("/");
}
