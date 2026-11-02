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
import { toursTab } from "@/tabs/tours";
import { analyticsTab, applicationsTab, retentionTab } from "@/tabs/placeholders";
import type { TabDefinition } from "@/tabs/types";

export const tabs: TabDefinition[] = [toursTab, applicationsTab, retentionTab, analyticsTab];
