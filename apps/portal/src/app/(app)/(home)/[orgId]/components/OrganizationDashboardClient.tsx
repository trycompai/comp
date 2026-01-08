'use client';

import { useEmployeePortalOverview } from '../hooks/useEmployeePortalOverview';
import type { EmployeePortalDashboard } from '../types/employee-portal';
import { EmployeeTasksList } from './EmployeeTasksList';

export function OrganizationDashboardClient({
  organizationId,
  initialDashboard,
}: {
  organizationId: string;
  initialDashboard?: EmployeePortalDashboard;
}) {
  const { data, error, isLoading } = useEmployeePortalOverview({
    organizationId,
    initialDashboard,
  });

  if (isLoading && !data) {
    return null;
  }

  if (error || data?.error) {
    return null;
  }

  const dashboard = data?.data ?? initialDashboard;
  if (!dashboard) return null;

  return (
    <EmployeeTasksList
      policies={dashboard.policies}
      trainingVideos={dashboard.trainingVideos}
      member={dashboard.member}
      fleetPolicies={dashboard.fleetPolicies}
      host={dashboard.host}
    />
  );
}
