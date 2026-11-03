import { createElement } from "react";
import type { TabDefinition } from "@/tabs/types";
import { OfficeScreen } from "@/tabs/office/OfficeScreen";

export const studentListTab: TabDefinition = {
  id: "student-list",
  label: "Student List",
  href: "/student-list",
  enabled: true,
  description: "Active students are those with a No. LOA students stay listed.",
  Component: function StudentListScreen() {
    return createElement(OfficeScreen, { tab: "student-list" });
  },
};
