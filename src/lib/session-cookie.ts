import { isSchoolEmail } from "@/lib/access";

function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
}

async function hmac(secret: string, value: string): Promise<string> {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(value));
  return bytesToBase64Url(new Uint8Array(signature));
}

function sameText(left: string, right: string): boolean {
  if (left.length !== right.length) return false;
  let mismatch = 0;
  for (let index = 0; index < left.length; index += 1) mismatch |= left.charCodeAt(index) ^ right.charCodeAt(index);
  return mismatch === 0;
}

export async function signSession(email: string, secret: string): Promise<string> {
  const normalized = email.trim().toLowerCase();
  return `${normalized}.${await hmac(secret, normalized)}`;
}

export async function readSessionEmail(signed: string, secret: string): Promise<string | null> {
  const index = signed.lastIndexOf(".");
  if (index <= 0 || !secret) return null;
  const email = signed.slice(0, index);
  const mac = signed.slice(index + 1);
  if (!sameText(mac, await hmac(secret, email))) return null;
  return isSchoolEmail(email) ? email : null;
}
