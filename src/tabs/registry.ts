/**
 * Plug-in tabs.
 *
 * To add a tab:
 * 1. Create `src/tabs/<id>/index.ts` exporting a `TabDefinition`.
 * 2. Import it below and append it to `tabs`.
 *
 * The route `src/app/[[...slug]]/page.tsx` renders `Component` when the tab is
 * enabled. No new page file is required. If the tab stores rows, also add a
 * sheet in `src/lib/sheet/schema.ts`.
 */
import { admittedTab } from "@/tabs/admitted";
import { alumniTab } from "@/tabs/alumni";
import { applicantsTab } from "@/tabs/applicants";
import { assessmentsTab } from "@/tabs/assessments";
import { canceledDeclinedTab } from "@/tabs/canceled-declined";
import { offersTab } from "@/tabs/offers";
import { analyticsTab, retentionTab } from "@/tabs/placeholders";
import { scholarshipsTab } from "@/tabs/scholarships";
import { studentListTab } from "@/tabs/student-list";
import { toursTab } from "@/tabs/tours";
import { withdrawalsTab } from "@/tabs/withdrawals";
import type { TabDefinition } from "@/tabs/types";

export const tabs: TabDefinition[] = [
  toursTab,
  applicantsTab,
  assessmentsTab,
  admittedTab,
  canceledDeclinedTab,
  offersTab,
  studentListTab,
  withdrawalsTab,
  alumniTab,
  scholarshipsTab,
  retentionTab,
  analyticsTab,
];
