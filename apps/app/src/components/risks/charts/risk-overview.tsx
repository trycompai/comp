import { RisksByDepartment } from "./risks-by-department";
import { RisksByStatus } from "./risks-by-status";

interface RiskOverviewProps {
  organizationId: string;
}

export function RiskOverview({ organizationId }: RiskOverviewProps) {
  return (
    <>
      <RisksByStatus organizationId={organizationId} />
      <RisksByDepartment organizationId={organizationId} />
    </>
  );
}
