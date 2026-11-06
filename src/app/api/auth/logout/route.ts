import { NextResponse } from "next/server";
import { clearSessionCookie } from "@/lib/server/google-auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request) {
  await clearSessionCookie();
  return NextResponse.redirect(new URL("/", request.url), 303);
}
