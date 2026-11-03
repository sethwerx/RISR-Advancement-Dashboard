import { ScaffoldScreen } from "@/tabs/scaffold/ScaffoldScreen";
import { canceledDeclinedColumns, canceledDeclinedRows } from "@/tabs/canceled-declined/sample";

export function CanceledDeclinedScreen() {
  return (
    <ScaffoldScreen
      title="Canceled/Declined"
      description="Placeholder for applications that were canceled or declined. No live source is connected yet."
      columns={canceledDeclinedColumns}
      rows={canceledDeclinedRows}
    />
  );
}
