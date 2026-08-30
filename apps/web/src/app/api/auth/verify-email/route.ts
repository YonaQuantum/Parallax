import { redirect } from "next/navigation";
import { verifyEmailToken } from "@/features/auth/email-verification";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const token = url.searchParams.get("token");

  if (!token) {
    redirect("/login?verified=missing");
  }

  const verified = await verifyEmailToken(token);

  redirect(verified ? "/login?verified=1" : "/login?verified=invalid");
}
