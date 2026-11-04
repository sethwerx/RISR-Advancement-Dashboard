import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { allowedEmailDomain } from "@/lib/access";
import { isMockMode, getServerConfig } from "@/lib/server/env";
import { createOAuthState } from "@/lib/server/google-auth";
import { jsonError } from "@/lib/server/http";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function safeNext(value: string | null): string {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return "/";
  return value;
}

export async function GET(request: Request) {
  try {
    if (isMockMode()) {
      return NextResponse.redirect(new URL("/?auth=sample", request.url));
    }
    const cfg = getServerConfig();
    if (!cfg.google.clientId || !cfg.google.clientSecret) {
      return NextResponse.json({ error: "Google OAuth is not configured." }, { status: 500 });
    }
    const url = new URL(request.url);
    const connect = url.searchParams.get("connect") === "admissions";
    const state = createOAuthState();
    const jar = await cookies();
    const cookie = {
      httpOnly: true,
      sameSite: "lax" as const,
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 600,
    };
    jar.set("risr_oauth_state", state.signed, cookie);
    jar.set("risr_oauth_purpose", connect ? "admissions" : "viewer", cookie);
    jar.set("risr_oauth_next", safeNext(url.searchParams.get("next")), cookie);
    const auth = new URL("https://accounts.google.com/o/oauth2/v2/auth");
    auth.searchParams.set("client_id", cfg.google.clientId);
    auth.searchParams.set("redirect_uri", cfg.google.redirectUri);
    auth.searchParams.set("response_type", "code");
    auth.searchParams.set("state", state.raw);
    auth.searchParams.set("include_granted_scopes", "true");
    if (connect) {
      auth.searchParams.set("scope", cfg.google.scopes.join(" "));
      auth.searchParams.set("access_type", "offline");
      auth.searchParams.set("prompt", "consent");
      auth.searchParams.set("login_hint", cfg.google.organizerEmail);
    } else {
      auth.searchParams.set("scope", "openid email");
      auth.searchParams.set("hd", allowedEmailDomain());
      auth.searchParams.set("prompt", "select_account");
    }
    return NextResponse.redirect(auth);
  } catch (error) {
    return jsonError(error);
  }
}
