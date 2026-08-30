import { createHash, randomBytes } from "node:crypto";
import { prisma } from "@/server/db/prisma";
import { sendVerificationEmail } from "@/server/email";

const VERIFICATION_TOKEN_TTL_HOURS = 24;

export async function sendAccountVerification(input: {
  userId: string;
  email: string;
  name: string;
}) {
  const token = randomBytes(32).toString("base64url");
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + VERIFICATION_TOKEN_TTL_HOURS * 60 * 60 * 1000);

  await prisma.emailVerificationToken.create({
    data: {
      userId: input.userId,
      email: input.email,
      tokenHash,
      expiresAt
    }
  });

  const verifyUrl = `${getAppUrl()}/api/auth/verify-email?token=${token}`;

  await sendVerificationEmail({
    to: input.email,
    name: input.name,
    verifyUrl
  });
}

export async function verifyEmailToken(token: string) {
  const tokenHash = hashToken(token);
  const record = await prisma.emailVerificationToken.findUnique({
    where: { tokenHash },
    include: {
      user: {
        select: {
          id: true,
          email: true
        }
      }
    }
  });

  if (!record || record.usedAt || record.expiresAt <= new Date()) {
    return false;
  }

  if (!record.user.email || record.user.email.toLowerCase() !== record.email.toLowerCase()) {
    return false;
  }

  await prisma.$transaction([
    prisma.emailVerificationToken.update({
      where: { id: record.id },
      data: { usedAt: new Date() }
    }),
    prisma.user.update({
      where: { id: record.userId },
      data: { emailVerified: new Date() }
    })
  ]);

  return true;
}

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function getAppUrl() {
  return process.env.APP_URL ?? "http://localhost:3000";
}
