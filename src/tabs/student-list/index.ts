import type { TabDefinition } from "@/tabs/types";
import { StudentListScreen } from "@/tabs/student-list/StudentListScreen";

export const studentListTab: TabDefinition = {
  id: "student-list",
  label: "Student List",
  href: "/student-list",
  enabled: true,
  description: "Active students are those with a No. LOA students stay listed. Sample data only.",
  Component: StudentListScreen,
};
