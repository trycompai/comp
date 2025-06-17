import { RisksByDepartment } from './risks-by-department';
import { RisksByStatus } from './risks-by-status';

export function RiskOverview() {
  return (
    <>
      <RisksByStatus />
      <RisksByDepartment />
    </>
  );
}
