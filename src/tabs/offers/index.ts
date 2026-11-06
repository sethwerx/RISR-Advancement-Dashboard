import { createElement } from "react";
import type { TabDefinition } from "@/tabs/types";
import { OfficeScreen } from "@/tabs/office/OfficeScreen";

export const offersTab: TabDefinition = {
  id: "offers",
  label: "Offers",
  href: "/offers",
  enabled: true,
  description: "Offers derived from admitted dates, seat-reservation tags, and status levels.",
  Component: function OffersScreen() {
    return createElement(OfficeScreen, { tab: "offers" });
  },
};
