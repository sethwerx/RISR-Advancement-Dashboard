import "server-only";

import { createHmac, createSign, randomBytes, timingSafeEqual } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { cookies } from "next/headers";
import { getServerConfig } from "@/lib/server/env";
import { HttpError } from "@/lib/server/http";
import { redact } from "@/lib/redact";

const oauthFile = path.join(process.cwd(), "data", "google-oauth.json");
const sheetFile = path.join(process.cwd(), "data", "sheet-id.json");

type StoredOAuth = { refreshToken?: string; email?: string };

let memoryRefresh = "";
let accessCache: { token: string; exp: number; email: string } | null = null;

function signValue(value: string, secret: string): string {
  const mac = createHmac("sha256", secret).update(value).digest("base64url");
  return `${value}.${mac}`;
}

function verifyValue(signed: string, secret: string): string | null {
  const index = signed.lastIndexOf(".");
  if (index <= 0) return null;
  const value = signed.slice(0, index);
  const expected = signValue(value, secret);
  const left = Buffer.from(signed);
  const right = Buffer.from(expected);
  if (left.length !== right.length || !timingSafeEqual(left, right)) return null;
  return value;
}

function readOAuthFile(): StoredOAuth {
  try {
    return JSON.parse(readFileSync(oauthFile, "utf8")) as StoredOAuth;
  } catch {
    return {};
  }
}

function writeOAuthFile(next: StoredOAuth) {
  mkdirSync(path.dirname(oauthFile), { recursive: true });
  writeFileSync(oauthFile, JSON.stringify(next), { mode: 0o600 });
}

export function currentRefreshToken(): string {
  if (memoryRefresh) return memoryRefresh;
  const fromEnv = getServerConfig().google.refreshToken;
  if (fromEnv) return fromEnv;
  return readOAuthFile().refreshToken || "";
}

export function clearGoogleAccessCache() {
  accessCache = null;
}

export function readSavedSheetId(): string {
  if (getServerConfig().google.masterSheetId) return getServerConfig().google.masterSheetId;
  try {
    const parsed = JSON.parse(readFileSync(sheetFile, "utf8")) as { id?: string };
    return parsed.id || "";
  } catch {
    return "";
  }
}

export function saveSheetId(id: string) {
  if (getServerConfig().google.masterSheetId) return;
  mkdirSync(path.dirname(sheetFile), { recursive: true });
  writeFileSync(sheetFile, JSON.stringify({ id }), { mode: 0o600 });
}

type ServiceAccount = { client_email: string; private_key: string };

let serviceCache: { token: string; exp: number } | null = null;

function loadServiceAccount(): ServiceAccount | null {
  const raw = process.env.GOOGLE_SERVICE_ACCOUNT_JSON?.trim();
  if (!raw) return null;
  const text = raw.startsWith("{") ? raw : readFileSync(raw, "utf8");
  const parsed = JSON.parse(text) as ServiceAccount;
  if (!parsed.client_email || !parsed.private_key) {
    throw new HttpError(500, "The Google service account JSON is missing client_email or private_key.");
  }
  return parsed;
}

async function getServiceAccountToken(): Promise<string> {
  if (serviceCache && Date.now() < serviceCache.exp - 60_000) return serviceCache.token;
  const account = loadServiceAccount();
  if (!account) throw new HttpError(500, "Google service account JSON is not configured.");
  const header = Buffer.from(JSON.stringify({ alg: "RS256", typ: "JWT" })).toString("base64url");
  const now = Math.floor(Date.now() / 1000);
  const claim = Buffer.from(
    JSON.stringify({
      iss: account.client_email,
      scope: "https://www.googleapis.com/auth/spreadsheets",
      aud: "https://oauth2.googleapis.com/token",
      iat: now,
      exp: now + 3600,
    }),
  ).toString("base64url");
  const unsigned = `${header}.${claim}`;
  const signature = createSign("RSA-SHA256").update(unsigned).sign(account.private_key).toString("base64url");
  const body = new URLSearchParams({
    grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
    assertion: `${unsigned}.${signature}`,
  });
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" },
    body,
    cache: "no-store",
  });
  if (!response.ok) throw new HttpError(response.status, "Google service account token request failed.");
  const parsed = (await response.json()) as { access_token?: string; expires_in?: number };
  if (!parsed.access_token) throw new HttpError(500, "Google service account token response had no access token.");
  serviceCache = { token: parsed.access_token, exp: Date.now() + (parsed.expires_in ?? 3600) * 1000 };
  return parsed.access_token;
}

/** Service account when configured, otherwise the admissions@ OAuth refresh token. */
export async function getSheetsToken(): Promise<string> {
  if (process.env.GOOGLE_SERVICE_ACCOUNT_JSON?.trim()) return getServiceAccountToken();
  return getGoogleAccessToken();
}

export async function getGoogleAccessToken(): Promise<string> {
  if (accessCache && Date.now() < accessCache.exp - 60_000) return accessCache.token;
  const cfg = getServerConfig();
  const refresh = currentRefreshToken();
  if (!cfg.google.clientId || !cfg.google.clientSecret || !refresh) {
    throw new HttpError(401, "Google is not connected. Sign in as the admissions account.");
  }
  const body = new URLSearchParams({
    client_id: cfg.google.clientId,
    client_secret: cfg.google.clientSecret,
    refresh_token: refresh,
    grant_type: "refresh_token",
  });
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
      "User-Agent": "RISR-Advancement-Dashboard/1.0",
    },
    body,
    cache: "no-store",
  });
  const text = await response.text();
  if (!response.ok) {
    accessCache = null;
    throw new Error(`Google token refresh failed (${response.status}): ${redact(text).slice(0, 200)}`);
  }
  const parsed = JSON.parse(text) as { access_token?: string; expires_in?: number };
  if (!parsed.access_token) throw new Error("Google token refresh did not include an access token.");
  const email = await fetchEmail(parsed.access_token);
  accessCache = {
    token: parsed.access_token,
    exp: Date.now() + (parsed.expires_in ?? 3600) * 1000,
    email,
  };
  return parsed.access_token;
}

async function fetchEmail(token: string): Promise<string> {
  const response = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
    headers: {
      Authorization: `Bearer ${token}`,
      "User-Agent": "RISR-Advancement-Dashboard/1.0",
    },
    cache: "no-store",
  });
  if (!response.ok) return "";
  const parsed = (await response.json()) as { email?: string };
  return (parsed.email ?? "").toLowerCase();
}

export async function getGoogleEmail(): Promise<string> {
  if (accessCache && Date.now() < accessCache.exp - 60_000) return accessCache.email;
  await getGoogleAccessToken();
  return accessCache?.email ?? "";
}

export async function googleJson(url: string, init: RequestInit = {}, retry = true): Promise<Record<string, unknown>> {
  const token = await getGoogleAccessToken();
  const headers = new Headers(init.headers);
  headers.set("Authorization", `Bearer ${token}`);
  headers.set("User-Agent", "RISR-Advancement-Dashboard/1.0");
  if (init.body && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");
  const response = await fetch(url, { ...init, headers, cache: "no-store" });
  if (response.status === 401 && retry) {
    clearGoogleAccessCache();
    return googleJson(url, init, false);
  }
  const text = await response.text();
  if (!response.ok) {
    throw new Error(`Google request failed (${response.status}): ${redact(text).slice(0, 400)}`);
  }
  return text ? (JSON.parse(text) as Record<string, unknown>) : {};
}

export async function readSession(): Promise<boolean> {
  const secret = getServerConfig().sessionSecret;
  if (!secret) return false;
  const jar = await cookies();
  const raw = jar.get("risr_session")?.value ?? "";
  return verifyValue(raw, secret) === "1";
}

export async function assertCanWrite(): Promise<void> {
  const cfg = getServerConfig();
  if (cfg.mock) return;
  if (!cfg.sessionSecret) throw new HttpError(500, "Set SESSION_SECRET before signing in.");
  if (!(await readSession())) {
    throw new HttpError(401, "Sign in with the admissions Google account first.");
  }
  const email = await getGoogleEmail();
  if (email !== cfg.google.organizerEmail) {
    throw new HttpError(
      403,
      `Signed in as ${email || "an unknown account"}. Tours can only be changed by ${cfg.google.organizerEmail}.`,
    );
  }
}

export function createOAuthState(): { raw: string; signed: string } {
  const secret = getServerConfig().sessionSecret;
  if (!secret) throw new HttpError(500, "Set SESSION_SECRET before signing in.");
  const raw = randomBytes(16).toString("hex");
  return { raw, signed: signValue(raw, secret) };
}

export function readOAuthState(signed: string): string | null {
  const secret = getServerConfig().sessionSecret;
  if (!secret) return null;
  return verifyValue(signed, secret);
}

export async function setSessionCookie() {
  const secret = getServerConfig().sessionSecret;
  if (!secret) throw new HttpError(500, "Set SESSION_SECRET before signing in.");
  const jar = await cookies();
  jar.set("risr_session", signValue("1", secret), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
}

export async function clearSessionCookie() {
  const jar = await cookies();
  jar.set("risr_session", "", { httpOnly: true, path: "/", maxAge: 0 });
}

export async function exchangeAuthCode(code: string): Promise<string> {
  const cfg = getServerConfig();
  const body = new URLSearchParams({
    code,
    client_id: cfg.google.clientId,
    client_secret: cfg.google.clientSecret,
    redirect_uri: cfg.google.redirectUri,
    grant_type: "authorization_code",
  });
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
      "User-Agent": "RISR-Advancement-Dashboard/1.0",
    },
    body,
    cache: "no-store",
  });
  const text = await response.text();
  if (!response.ok) {
    throw new HttpError(400, `Google did not accept the sign-in (${response.status}).`);
  }
  const parsed = JSON.parse(text) as { refresh_token?: string };
  const existing = readOAuthFile();
  const refresh = parsed.refresh_token || existing.refreshToken || "";
  if (!refresh && !currentRefreshToken()) {
    throw new HttpError(400, "Google did not return a refresh token. Remove the app's access and sign in again.");
  }
  if (parsed.refresh_token) {
    memoryRefresh = parsed.refresh_token;
    writeOAuthFile({ ...existing, refreshToken: parsed.refresh_token });
  }
  clearGoogleAccessCache();
  const email = await getGoogleEmail();
  writeOAuthFile({ ...readOAuthFile(), email });
  return email;
}
