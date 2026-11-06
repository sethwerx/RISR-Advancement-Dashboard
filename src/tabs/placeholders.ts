import type { TabDefinition } from "@/tabs/types";

export const retentionTab: TabDefinition = {
  id: "retention",
  label: "Retention",
  href: "/retention",
  enabled: false,
  description: "Returning families and re-enrolment.",
};

export const analyticsTab: TabDefinition = {
  id: "analytics",
  label: "Analytics",
  href: "/analytics",
  enabled: false,
  description: "A full-page analytics home. Tour charts already open from Tours/Visits.",
};
