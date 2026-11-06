"use client";

import { useEffect, useState } from "react";
import { dashboardConfig } from "@/config/dashboard.config";
import { BrandLogo } from "@/components/shell/BrandLogo";
import { TabBar } from "@/components/shell/TabBar";
import type { AccountState } from "@/lib/types";

export function AppShell({ children }: { children: React.ReactNode }) {
  const [account, setAccount] = useState<AccountState | null>(null);
  const [authNote, setAuthNote] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("auth") === "failed") {
      setAuthNote("Google sign-in did not finish. Check the OAuth client and try again.");
    }
    fetch("/api/auth/status")
      .then((response) => response.json())
      .then((payload: AccountState) => setAccount(payload))
      .catch(() => setAccount(null));
  }, []);

  return (
    <div className="min-h-screen">
      <header className="bg-navy-900 text-white">
        <div className="mx-auto flex max-w-[1240px] items-center justify-between gap-6 px-4 py-4">
          <div className="flex items-center gap-3">
            <BrandLogo variant="onDark" className="h-16 w-auto" />
            <div>
              <p className="font-title text-4xl leading-none">{dashboardConfig.ui.productName}</p>
              <p className="mt-1 text-sm text-white/75">
                {dashboardConfig.school.office}
                <span className="mx-2 text-white/35">·</span>
                {dashboardConfig.school.name}
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-sm font-semibold">{dashboardConfig.ui.userDisplayName}</p>
            <p className="text-xs text-white/70">{dashboardConfig.ui.userTitle}</p>
            <div className="no-print mt-2 flex items-center justify-end gap-2 text-xs">
              {!account ? (
                <span className="text-white/60">Checking connection</span>
              ) : account.mock ? (
                <span className="rounded-full bg-white/10 px-2 py-1">Sample data</span>
              ) : account.signedIn ? (
                <>
                  <span className="rounded-full bg-white/10 px-2 py-1">{account.email}</span>
                  <form action="/api/auth/logout" method="post">
                    <button className="rounded-full border border-white/30 px-2 py-1" type="submit">
                      Sign out
                    </button>
                  </form>
                </>
              ) : (
                <a className="rounded-full bg-white px-2 py-1 font-semibold text-navy-900" href="/api/auth/google/start">
                  Sign in with Google
                </a>
              )}
            </div>
          </div>
        </div>
      </header>
      <TabBar />
      {authNote ? (
        <p className="no-print bg-[#f8e8e6] px-4 py-2 text-center text-sm text-[#8d2f2f]">{authNote}</p>
      ) : null}
      <main className="mx-auto max-w-[1240px] px-4 py-6">{children}</main>
    </div>
  );
}
