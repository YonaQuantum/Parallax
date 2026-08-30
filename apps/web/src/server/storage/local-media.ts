import { mkdir, readFile, writeFile } from "node:fs/promises";
import crypto from "node:crypto";
import path from "node:path";

const mimeTypes: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".mp4": "video/mp4",
  ".webm": "video/webm",
  ".pdf": "application/pdf"
};

export function getUploadDir() {
  const uploadDir = process.env.UPLOAD_DIR ?? "data/uploads";

  if (path.isAbsolute(uploadDir)) {
    return uploadDir;
  }

  return path.resolve(/*turbopackIgnore: true*/ process.cwd(), "../..", uploadDir);
}

export function resolveUploadPath(segments: string[]) {
  const uploadDir = getUploadDir();
  const filePath = path.resolve(uploadDir, ...segments);

  if (!filePath.startsWith(uploadDir + path.sep)) {
    return null;
  }

  return filePath;
}

export async function readLocalMedia(segments: string[]) {
  const filePath = resolveUploadPath(segments);

  if (!filePath) {
    return null;
  }

  const file = await readFile(/*turbopackIgnore: true*/ filePath);
  const contentType = mimeTypes[path.extname(filePath).toLowerCase()] ?? "application/octet-stream";

  return {
    file,
    contentType
  };
}

export async function saveLocalMedia(file: File) {
  const uploadDir = getUploadDir();
  const now = new Date();
  const year = String(now.getFullYear());
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const originalName = sanitizeFileName(file.name || "upload.bin");
  const extension = path.extname(originalName).toLowerCase();
  const objectKey = path.posix.join(year, month, `${crypto.randomUUID()}${extension}`);
  const filePath = path.resolve(uploadDir, objectKey);

  if (!filePath.startsWith(uploadDir + path.sep)) {
    throw new Error("Invalid upload path");
  }

  const bytes = Buffer.from(await file.arrayBuffer());
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, bytes);

  return {
    objectKey,
    originalName,
    mimeType: file.type || "application/octet-stream",
    byteSize: BigInt(bytes.byteLength),
    publicUrl: `${process.env.PUBLIC_UPLOAD_BASE_URL ?? "/uploads"}/${objectKey}`
  };
}

export function isAllowedMediaFile(file: File) {
  if (!file.name || file.size === 0) {
    return false;
  }

  const allowedTypes = [
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/gif",
    "video/mp4",
    "video/webm",
    "application/pdf"
  ];

  return allowedTypes.includes(file.type);
}

function sanitizeFileName(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 160);
}
