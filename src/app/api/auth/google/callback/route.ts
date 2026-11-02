import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { exchangeAuthCode, readOAuthState, setSessionCookie } from "@/lib/server/google-auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code") ?? "";
  const state = url.searchParams.get("state") ?? "";
  const jar = await cookies();
  const signed = jar.get("risr_oauth_state")?.value ?? "";
  const expected = readOAuthState(signed);
  const failed = NextResponse.redirect(new URL("/?auth=failed", request.url));
  if (!code || !expected || expected !== state) return failed;
  try {
    await exchangeAuthCode(code);
    await setSessionCookie();
    jar.set("risr_oauth_state", "", { httpOnly: true, path: "/", maxAge: 0 });
    return NextResponse.redirect(new URL("/", request.url));
  } catch {
    return failed;
  }
}
