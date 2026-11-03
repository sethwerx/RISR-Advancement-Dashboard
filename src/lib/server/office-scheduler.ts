import "server-only";

import { shouldRunScheduledSync } from "@/lib/office/schedule";
import { readSyncStamp } from "@/lib/server/office-store";
import { refreshOffice } from "@/lib/server/office-sync";

let started = false;

export function startOfficeScheduler() {
  if (started) return;
  started = true;
  setInterval(() => {
    if (!shouldRunScheduledSync(new Date(), readSyncStamp())) return;
    void refreshOffice("schedule").catch(() => {
      /* The next weekday slot retries. Errors stay out of the logs' secrets. */
    });
  }, 30_000);
}
