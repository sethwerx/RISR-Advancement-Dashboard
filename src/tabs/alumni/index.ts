import type { TabDefinition } from "@/tabs/types";
import { AlumniScreen } from "@/tabs/alumni/AlumniScreen";

export const alumniTab: TabDefinition = {
  id: "alumni",
  label: "Alumni",
  href: "/alumni",
  enabled: true,
  description: "Former students. Sample data only until the live source is specified.",
  Component: AlumniScreen,
};
