import type { TabDefinition } from "@/tabs/types";
import { CanceledDeclinedScreen } from "@/tabs/canceled-declined/CanceledDeclinedScreen";

export const canceledDeclinedTab: TabDefinition = {
  id: "canceled-declined",
  label: "Canceled/Declined",
  href: "/canceled-declined",
  enabled: true,
  description: "Canceled and declined applications. Sample data only until the live source is specified.",
  Component: CanceledDeclinedScreen,
};
