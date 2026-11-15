import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { beforeAll, describe, expect, it } from "vitest";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function read(file: string): string {
  return readFileSync(path.join(root, file), "utf8");
}

beforeAll(() => {
  execFileSync(process.execPath, ["scripts/build-apps-script.mjs"], { cwd: root, stdio: "pipe" });
}, 120_000);

describe("Apps Script project", () => {
  it("runs as the signed-in risr.ac.th user and lists only the scopes the page needs", () => {
    const manifest = JSON.parse(read("apps-script/appsscript.json")) as {
      timeZone: string;
      webapp: { executeAs: string; access: string };
      oauthScopes: string[];
    };
    expect(manifest.timeZone).toBe("Asia/Bangkok");
    expect(manifest.webapp).toEqual({ executeAs: "USER_ACCESSING", access: "DOMAIN" });
    expect(manifest.oauthScopes).toEqual([
      "https://www.googleapis.com/auth/spreadsheets",
      "https://www.googleapis.com/auth/calendar",
      "https://www.googleapis.com/auth/documents",
      "https://www.googleapis.com/auth/userinfo.email",
      "https://www.googleapis.com/auth/script.external_request",
    ]);
    expect(JSON.stringify(manifest)).not.toMatch(/ANYONE_ANONYMOUS|USER_DEPLOYING/);
  });

  it("serves the dashboard and a walk-in placeholder without secrets", () => {
    const code = read("apps-script/Code.gs");
    const walkin = read("apps-script/Walkin.html");
    expect(code).toContain("createHtmlOutputFromFile('Index')");
    expect(code).toContain("createHtmlOutputFromFile('Walkin')");
    expect(code).not.toContain("createTemplateFromFile('Index')");
    expect(code).toContain("page === 'walkin'");
    expect(code).toContain("?page=walkin");
    expect(code).toContain("&page=walkin");
    expect(code).toContain("Calendar writes must use sendUpdates=none.");
    expect(code).toContain("Calendar writes cannot include Meet.");
    expect(code).toContain("Tour calendar events cannot include an OpenApply Registration ID.");
    expect(code).toContain("Sign in with a @risr.ac.th account.");
    expect(code).toContain("!A1:AZ5000");
    expect(code).toContain("ScriptApp.getOAuthToken");
    const webhook = code.slice(code.indexOf("function proxyWebhook_"), code.indexOf("function assertCalendarWrite_"));
    expect(webhook).not.toContain("getOAuthToken");
    expect(webhook).toContain("That address is not a webhook.");
    expect(`${code}\n${walkin}\n${read("apps-script/appsscript.json")}`).not.toMatch(/client_secret|private_key|BEGIN PRIVATE|OA_CLIENT/i);
    expect(walkin).toContain("The staff walk-in screen will open on this page. It is not connected yet.");
    expect(walkin).toContain("{{DASHBOARD_URL}}");
    expect(walkin).toContain("Bebas Neue");
    expect(walkin).toContain("Calibri");
    expect(walkin).not.toContain("<form");
  });

  it("builds an Apps Script page and leaves the iMac file on Google sign-in", () => {
    const apps = read("apps-script/Index.html");
    const local = read("dist/advancement-office.html");
    expect(apps.length).toBeGreaterThan(100_000);
    expect(apps.length).toBeLessThan(4_000_000);
    expect(apps).toContain('<base target="_top" />');
    expect(apps).toContain('window.ADVANCEMENT_OFFICE_HOST = "apps-script"');
    expect(apps).toContain("Walk-in app not set up yet");
    expect(apps).toContain("data-walk-in");
    expect(apps).toContain("clientBootstrap");
    expect(apps).toContain("readSheetBatch");
    expect(apps).not.toContain("<?!=");
    expect(apps).not.toMatch(/client_secret|BEGIN PRIVATE KEY/);
    expect(local).not.toContain('window.ADVANCEMENT_OFFICE_HOST = "apps-script"');
    expect(local).not.toContain("<base target=");
    expect(local).toContain("accounts.google.com/gsi/client");
    expect(local).toContain("Walk-in app not set up yet");
    expect(local).toContain("735352551467-cpmt6ml08vrgbd4sp00psglno4hv45lr.apps.googleusercontent.com");
  });
});
