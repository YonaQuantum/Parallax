import { randomInt } from "node:crypto";
import { prisma } from "@/server/db/prisma";

export const IDENTITY_ID_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function segment(length = 4) {
  let value = "";

  for (let index = 0; index < length; index += 1) {
    value += IDENTITY_ID_ALPHABET[randomInt(IDENTITY_ID_ALPHABET.length)];
  }

  return value;
}

export function generateIdentityCode() {
  return `${segment()}-${segment()}-${segment()}`;
}

export async function generateUniqueIdentityCode() {
  for (let attempt = 0; attempt < 10; attempt += 1) {
    const code = generateIdentityCode();
    const existing = await prisma.identityCard.findUnique({
      where: { code },
      select: { id: true }
    });

    if (!existing) {
      return code;
    }
  }

  throw new Error("Unable to generate a unique identity code");
}

export async function generateNextIdentitySerial() {
  const count = await prisma.identityCard.count();

  for (let offset = 1; offset <= 20; offset += 1) {
    const serial = `PX-${String(count + offset).padStart(4, "0")}`;
    const existing = await prisma.identityCard.findUnique({
      where: { serial },
      select: { id: true }
    });

    if (!existing) {
      return serial;
    }
  }

  throw new Error("Unable to generate a unique identity serial");
}
