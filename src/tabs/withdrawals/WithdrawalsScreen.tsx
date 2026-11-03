import { ScaffoldScreen } from "@/tabs/scaffold/ScaffoldScreen";
import { withdrawalColumns, withdrawalRows } from "@/tabs/withdrawals/sample";

export function WithdrawalsScreen() {
  return (
    <ScaffoldScreen
      title="Withdrawals"
      description="Placeholder for students who left after enrolling. No live source is connected yet."
      columns={withdrawalColumns}
      rows={withdrawalRows}
    />
  );
}
