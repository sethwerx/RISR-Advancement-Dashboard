const SECRET_PATTERNS: Array<[RegExp, string]> = [
  [/ya29\.[A-Za-z0-9_\-]+/g, "[redacted-token]"],
  [/access_token["']?\s*[:=]\s*["'][^"']+["']/gi, "access_token:[redacted]"],
  [/refresh_token["']?\s*[:=]\s*["'][^"']+["']/gi, "refresh_token:[redacted]"],
  [/client_secret["']?\s*[:=]\s*["'][^"']+["']/gi, "client_secret:[redacted]"],
  [/Authorization:\s*Bearer\s+\S+/gi, "Authorization: Bearer [redacted]"],
  [/Basic\s+[A-Za-z0-9+/=]+/g, "Basic [redacted]"],
];

export function redact(value: string): string {
  return SECRET_PATTERNS.reduce((text, [pattern, replacement]) => text.replace(pattern, replacement), value);
}

export function errorMessage(error: unknown): string {
  if (error instanceof Error) return redact(error.message);
  return "Unexpected error";
}
