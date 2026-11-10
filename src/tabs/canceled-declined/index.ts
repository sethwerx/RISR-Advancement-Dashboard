import { createElement } from "react";
import type { TabDefinition } from "@/tabs/types";
import { OfficeScreen } from "@/tabs/office/OfficeScreen";

export const canceledDeclinedTab: TabDefinition = {
  id: "canceled-declined",
  label: "Canceled/Declined",
  href: "/canceled-declined",
  enabled: true,
  description: "Canceled and declined applications, with reason categories.",
  Component: function CanceledDeclinedScreen() {
    return createElement(OfficeScreen, { tab: "canceled-declined" });
  },
};
