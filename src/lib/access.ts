export const defaultAllowedDomain = "risr.ac.th";

type AccessEnv = {
  ALLOWED_EMAIL_DOMAIN?: string;
  AUTH_REQUIRED?: string;
  VERCEL?: string;
  NODE_ENV?: string;
};

export function allowedEmailDomain(env: AccessEnv = process.env): string {
  return (env.ALLOWED_EMAIL_DOMAIN || defaultAllowedDomain).trim().toLowerCase().replace(/^@/, "");
}

/** True only for a single mailbox at the school domain, such as name@risr.ac.th. */
export function isSchoolEmail(email: string, domain = allowedEmailDomain()): boolean {
  const normalized = email.trim().toLowerCase();
  const parts = normalized.split("@");
  return parts.length === 2 && parts[0].length > 0 && parts[1] === domain;
}

/**
 * The sign-in gate is on for a deployed production app.
 * Local `next dev` stays open unless AUTH_REQUIRED=true.
 */
export function accessGateEnabled(env: AccessEnv = process.env): boolean {
  const flag = env.AUTH_REQUIRED?.trim().toLowerCase();
  if (flag === "false" || flag === "0" || flag === "no") return false;
  if (flag === "true" || flag === "1" || flag === "yes") return true;
  return env.VERCEL === "1" || env.NODE_ENV === "production";
}
