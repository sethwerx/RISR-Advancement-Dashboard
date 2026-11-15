export const APPS_SCRIPT_TOKEN = "apps-script";

export type AppsScriptBootstrap = {
  email: string;
  walkInUrl: string;
};

declare global {
  interface Window {
    ADVANCEMENT_OFFICE_HOST?: string;
    ADVANCEMENT_OFFICE_APPS_SCRIPT?: AppsScriptBootstrap;
  }
}

type Runner = {
  withSuccessHandler: (fn: (value: unknown) => void) => Runner;
  withFailureHandler: (fn: (error: { message?: string }) => void) => Runner;
};

function scriptRunner(): Runner | null {
  if (typeof window === "undefined") return null;
  const google = (window as unknown as { google?: { script?: { run?: Runner } } }).google;
  const run = google?.script?.run;
  if (!run || typeof run.withSuccessHandler !== "function") return null;
  return run;
}

/** True only in the Apps Script HTML file. The iMac file does not set this flag. */
export function appsScriptHost(): boolean {
  if (typeof window === "undefined") return false;
  return window.ADVANCEMENT_OFFICE_HOST === "apps-script" || scriptRunner() !== null;
}

export function runAppsScript<T>(name: string, args: unknown[] = []): Promise<T> {
  const run = scriptRunner();
  if (!run) return Promise.reject(new Error("This page is not running as the Apps Script web app."));
  return new Promise((resolve, reject) => {
    const runner = run
      .withSuccessHandler((value: unknown) => resolve(value as T))
      .withFailureHandler((error: { message?: string }) => reject(new Error(error?.message || "The Apps Script call failed.")));
    const fn = (runner as unknown as Record<string, (...args: unknown[]) => void>)[name];
    if (typeof fn !== "function") {
      reject(new Error(`The Apps Script page is missing ${name}.`));
      return;
    }
    fn.apply(runner, args);
  });
}
