import { NextResponse } from "next/server";
import { readLocalMedia } from "@/server/storage/local-media";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path: segments } = await params;

  try {
    const media = await readLocalMedia(segments);

    if (!media) {
      return new NextResponse("Not found", { status: 404 });
    }

    return new NextResponse(media.file, {
      headers: {
        "Content-Type": media.contentType,
        "Cache-Control": "public, max-age=31536000, immutable"
      }
    });
  } catch {
    return new NextResponse("Not found", { status: 404 });
  }
}
