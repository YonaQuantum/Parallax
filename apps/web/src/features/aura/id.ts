import { randomInt } from "node:crypto";
import { prisma } from "@/server/db/prisma";

export const AURA_ID_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function segment(length = 4) {
  let value = "";

  for (let index = 0; index < length; index += 1) {
    value += AURA_ID_ALPHABET[randomInt(AURA_ID_ALPHABET.length)];
  }

  return value;
}

export function generateAuraCode() {
  return `${segment()}-${segment()}-${segment()}`;
}

export async function generateUniqueAuraCode() {
  for (let attempt = 0; attempt < 10; attempt += 1) {
    const code = generateAuraCode();
    const existing = await prisma.auraIdentity.findUnique({
      where: { code },
      select: { id: true }
    });

    if (!existing) {
      return code;
    }
  }

  throw new Error("Unable to generate a unique AURA ID");
}

export async function generateNextAuraSerial() {
  const count = await prisma.auraIdentity.count();

  for (let offset = 1; offset <= 20; offset += 1) {
    const serial = `AURA-${String(count + offset).padStart(4, "0")}`;
    const existing = await prisma.auraIdentity.findUnique({
      where: { serial },
      select: { id: true }
    });

    if (!existing) {
      return serial;
    }
  }

  throw new Error("Unable to generate a unique AURA serial");
}
