import { appsScriptHost, runAppsScript } from "@/lib/standalone/apps-script-host";
import { assertWebhookRequest } from "@/lib/standalone/google-proxy";

export type PostResult = { ok: boolean; status: number };

/**
 * POST JSON from the browser, or from Apps Script when the page is inside HtmlService.
 * The googleusercontent iframe cannot rely on the webhook sending CORS headers for that origin.
 */
export async function postJson(url: string, body: unknown, headers: Record<string, string> = {}): Promise<PostResult> {
  assertWebhookRequest(url, "POST");
  const payload = JSON.stringify(body);
  if (appsScriptHost()) {
    const result = await runAppsScript<{ status?: number }>("proxyApi", [
      { purpose: "webhook", url, method: "POST", body: payload, headers },
    ]);
    const status = Number(result?.status) || 0;
    return { ok: status >= 200 && status < 300, status };
  }
  const response = await fetch(url, {
    method: "POST",
    mode: "cors",
    headers: { "Content-Type": "application/json", ...headers },
    body: payload,
  });
  return { ok: response.ok, status: response.status };
}
