import type { TabDefinition } from "@/tabs/types";
import { AdmittedScreen } from "@/tabs/admitted/AdmittedScreen";

export const admittedTab: TabDefinition = {
  id: "admitted",
  label: "Admitted",
  href: "/admitted",
  enabled: true,
  description: "Admitted students. Sample data only until the live source is specified.",
  Component: AdmittedScreen,
};
