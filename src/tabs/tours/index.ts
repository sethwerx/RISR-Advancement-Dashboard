import type { TabDefinition } from "@/tabs/types";
import { ToursScreen } from "@/tabs/tours/ToursScreen";

export const toursTab: TabDefinition = {
  id: "tours",
  label: "Tours/Visits",
  href: "/",
  enabled: true,
  description: "OpenApply tour registrations and the School Tour/Visit calendar.",
  Component: ToursScreen,
};
