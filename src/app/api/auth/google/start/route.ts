import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { isMockMode } from "@/lib/server/env";
import { createOAuthState } from "@/lib/server/google-auth";
import { getServerConfig } from "@/lib/server/env";
import { jsonError } from "@/lib/server/http";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    if (isMockMode()) {
      return NextResponse.redirect(new URL("/?auth=sample", request.url));
    }
    const cfg = getServerConfig();
    if (!cfg.google.clientId || !cfg.google.clientSecret) {
      return NextResponse.json({ error: "Google OAuth is not configured." }, { status: 500 });
    }
    const state = createOAuthState();
    const jar = await cookies();
    jar.set("risr_oauth_state", state.signed, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 600,
    });
    const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
    url.searchParams.set("client_id", cfg.google.clientId);
    url.searchParams.set("redirect_uri", cfg.google.redirectUri);
    url.searchParams.set("response_type", "code");
    url.searchParams.set("scope", cfg.google.scopes.join(" "));
    url.searchParams.set("access_type", "offline");
    url.searchParams.set("prompt", "consent");
    url.searchParams.set("include_granted_scopes", "true");
    url.searchParams.set("login_hint", cfg.google.organizerEmail);
    url.searchParams.set("state", state.raw);
    return NextResponse.redirect(url);
  } catch (error) {
    return jsonError(error);
  }
}
