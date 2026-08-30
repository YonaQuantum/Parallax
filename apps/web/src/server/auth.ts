import "server-only";

import { randomBytes, createHash } from "node:crypto";
import { cookies } from "next/headers";
import { prisma } from "@/server/db/prisma";

const sessionCookieName = "parallax_session";
const sessionDays = 30;
const sessionMaxAge = sessionDays * 24 * 60 * 60;

export type AppSession = {
  user: {
    id: string;
    name: string | null;
    email: string | null;
    image: string | null;
    handle: string;
    role: "OWNER" | "MODERATOR" | "MEMBER";
  };
};

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function createSessionToken() {
  return randomBytes(32).toString("base64url");
}

export async function auth(): Promise<AppSession | null> {
  const token = (await cookies()).get(sessionCookieName)?.value;

  if (!token) {
    return null;
  }

  const session = await prisma.session.findUnique({
    where: {
      sessionToken: hashToken(token)
    },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          emailVerified: true,
          image: true,
          handle: true,
          role: true
        }
      }
    }
  });

  if (!session || session.expires <= new Date() || !session.user.emailVerified) {
    return null;
  }

  return {
    user: {
      id: session.user.id,
      name: session.user.name,
      email: session.user.email,
      image: session.user.image,
      handle: session.user.handle,
      role: session.user.role
    }
  };
}

export async function createSession(userId: string) {
  const token = createSessionToken();
  const expires = new Date(Date.now() + sessionMaxAge * 1000);

  await prisma.session.create({
    data: {
      sessionToken: hashToken(token),
      userId,
      expires
    }
  });

  (await cookies()).set(sessionCookieName, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: sessionMaxAge,
    expires
  });
}

export async function destroySession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(sessionCookieName)?.value;

  if (token) {
    await prisma.session.deleteMany({
      where: {
        sessionToken: hashToken(token)
      }
    });
  }

  cookieStore.delete(sessionCookieName);
}
