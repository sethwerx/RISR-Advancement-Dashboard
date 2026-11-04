import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { accessGateEnabled } from "@/lib/access";
import { readSessionEmail } from "@/lib/session-cookie";

function isPublic(pathname: string): boolean {
  return (
    pathname === "/sign-in" ||
    pathname.startsWith("/api/auth/") ||
    pathname === "/api/cron/sync" ||
    pathname.startsWith("/brand/") ||
    pathname === "/manifest.webmanifest" ||
    pathname === "/icon.png" ||
    pathname === "/favicon.ico"
  );
}

export async function middleware(request: NextRequest) {
  if (!accessGateEnabled()) return NextResponse.next();
  const { pathname } = request.nextUrl;
  if (isPublic(pathname)) return NextResponse.next();
  const secret = process.env.SESSION_SECRET || "";
  const raw = request.cookies.get("risr_session")?.value ?? "";
  const email = secret ? await readSessionEmail(raw, secret) : null;
  if (email) return NextResponse.next();
  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "Sign in with a risr.ac.th Google account." }, { status: 401 });
  }
  const signIn = request.nextUrl.clone();
  signIn.pathname = "/sign-in";
  signIn.search = "";
  if (pathname !== "/") signIn.searchParams.set("next", pathname);
  return NextResponse.redirect(signIn);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image).*)"],
};
