import { ScaffoldScreen } from "@/tabs/scaffold/ScaffoldScreen";
import { admittedColumns, admittedRows } from "@/tabs/admitted/sample";

export function AdmittedScreen() {
  return (
    <ScaffoldScreen
      title="Admitted"
      description="Placeholder for students who have been admitted. No live source is connected yet."
      columns={admittedColumns}
      rows={admittedRows}
    />
  );
}
