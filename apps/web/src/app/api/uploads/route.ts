import { NextResponse } from "next/server";
import { auth } from "@/server/auth";
import { prisma } from "@/server/db/prisma";
import { isAllowedMediaFile, saveLocalMedia } from "@/server/storage/local-media";

const maxUploadBytes = 512 * 1024 * 1024;

export async function POST(request: Request) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await request.formData();
  const file = formData.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Missing file" }, { status: 400 });
  }

  if (file.size > maxUploadBytes) {
    return NextResponse.json({ error: "File too large" }, { status: 413 });
  }

  if (!isAllowedMediaFile(file)) {
    return NextResponse.json({ error: "Unsupported file type" }, { status: 415 });
  }

  const saved = await saveLocalMedia(file);
  const media = await prisma.mediaFile.create({
    data: {
      ...saved,
      provider: "LOCAL",
      uploaderId: session.user.id
    },
    select: {
      id: true,
      objectKey: true,
      originalName: true,
      mimeType: true,
      byteSize: true,
      publicUrl: true
    }
  });

  return NextResponse.json({
    media: {
      ...media,
      byteSize: media.byteSize.toString()
    }
  });
}
