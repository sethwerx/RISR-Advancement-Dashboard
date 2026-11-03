import { ScaffoldScreen } from "@/tabs/scaffold/ScaffoldScreen";
import { activeStudentCount, studentListColumns, studentListRows } from "@/tabs/student-list/sample";

export function StudentListScreen() {
  const active = activeStudentCount(studentListRows);
  return (
    <ScaffoldScreen
      title="Student List"
      description="Placeholder roster. A student counts as active only when they have a No. LOA students stay on the list."
      columns={studentListColumns}
      rows={studentListRows}
      summary={`Active: ${active}. Only students with a No. are counted. LOA students stay listed.`}
    />
  );
}
