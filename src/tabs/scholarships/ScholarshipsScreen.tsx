import { ScaffoldScreen } from "@/tabs/scaffold/ScaffoldScreen";
import { scholarshipColumns, scholarshipRows } from "@/tabs/scholarships/sample";

export function ScholarshipsScreen() {
  return (
    <ScaffoldScreen
      title="Scholarships"
      description="Placeholder for scholarship applications. No live source is connected yet."
      columns={scholarshipColumns}
      rows={scholarshipRows}
    />
  );
}
