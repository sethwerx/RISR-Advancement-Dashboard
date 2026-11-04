import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { HttpError } from "@/lib/server/http";
import { exchangeAdmissionsCode, exchangeViewerCode, readOAuthState, setSessionCookie } from "@/lib/server/google-auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function safeNext(value: string | undefined): string {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return "/";
  return value;
}

function escapeHtml(value: string): string {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code") ?? "";
  const state = url.searchParams.get("state") ?? "";
  const jar = await cookies();
  const expected = readOAuthState(jar.get("risr_oauth_state")?.value ?? "");
  const purpose = jar.get("risr_oauth_purpose")?.value === "admissions" ? "admissions" : "viewer";
  const next = safeNext(jar.get("risr_oauth_next")?.value);
  const failed = (error: string) => NextResponse.redirect(new URL(`/sign-in?error=${error}`, request.url));
  if (!code || !expected || expected !== state) return failed("failed");
  try {
    if (purpose === "admissions") {
      const connected = await exchangeAdmissionsCode(code);
      await setSessionCookie(connected.email);
      jar.set("risr_oauth_state", "", { httpOnly: true, path: "/", maxAge: 0 });
      jar.set("risr_oauth_purpose", "", { httpOnly: true, path: "/", maxAge: 0 });
      const token = escapeHtml(connected.refreshToken);
      return new NextResponse(
        `<!doctype html><html><body style="font-family:sans-serif;max-width:40rem;margin:2rem auto"><h1>Admissions connection</h1><p>Paste this value into the host environment as <code>GOOGLE_REFRESH_TOKEN</code>, then close this page. It is shown once and is not stored in the repository.</p><textarea readonly rows="6" style="width:100%">${token}</textarea></body></html>`,
        { headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" } },
      );
    }
    const email = await exchangeViewerCode(code);
    await setSessionCookie(email);
    jar.set("risr_oauth_state", "", { httpOnly: true, path: "/", maxAge: 0 });
    jar.set("risr_oauth_purpose", "", { httpOnly: true, path: "/", maxAge: 0 });
    return NextResponse.redirect(new URL(next, request.url));
  } catch (error) {
    const codeName = error instanceof HttpError && (error.message === "domain" || error.message === "organizer") ? error.message : "failed";
    return failed(codeName);
  }
}
