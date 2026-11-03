import type { TabDefinition } from "@/tabs/types";
import { WithdrawalsScreen } from "@/tabs/withdrawals/WithdrawalsScreen";

export const withdrawalsTab: TabDefinition = {
  id: "withdrawals",
  label: "Withdrawals",
  href: "/withdrawals",
  enabled: true,
  description: "Students who withdrew. Sample data only until the live source is specified.",
  Component: WithdrawalsScreen,
};
