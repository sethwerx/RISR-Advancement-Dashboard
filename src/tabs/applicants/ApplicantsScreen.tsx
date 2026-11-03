import { ScaffoldScreen } from "@/tabs/scaffold/ScaffoldScreen";
import { admissionPipelineStages, applicantColumns, applicantRows } from "@/tabs/applicants/sample";

export function ApplicantsScreen() {
  return (
    <ScaffoldScreen
      title="Applicants"
      description={`Placeholder for the School Admission Pipeline. Stage values are ${admissionPipelineStages.join(", ")}.`}
      columns={applicantColumns}
      rows={applicantRows}
    />
  );
}
