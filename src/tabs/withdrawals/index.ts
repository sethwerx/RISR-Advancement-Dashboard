import { createElement } from "react";
import type { TabDefinition } from "@/tabs/types";
import { OfficeScreen } from "@/tabs/office/OfficeScreen";

export const withdrawalsTab: TabDefinition = {
  id: "withdrawals",
  label: "Withdrawals",
  href: "/withdrawals",
  enabled: true,
  description: "Withdrawals with categorized parent reasons.",
  Component: function WithdrawalsScreen() {
    return createElement(OfficeScreen, { tab: "withdrawals" });
  },
};
