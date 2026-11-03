import { ScaffoldScreen } from "@/tabs/scaffold/ScaffoldScreen";
import { alumniColumns, alumniRows } from "@/tabs/alumni/sample";

export function AlumniScreen() {
  return (
    <ScaffoldScreen
      title="Alumni"
      description="Placeholder for former students. No live source is connected yet."
      columns={alumniColumns}
      rows={alumniRows}
    />
  );
}
