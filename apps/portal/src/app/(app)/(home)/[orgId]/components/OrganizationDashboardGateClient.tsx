'use client';

import type { EmployeePortalDashboard } from '../types/employee-portal';
import { OrganizationDashboardClient } from './OrganizationDashboardClient';

interface OrganizationDashboardGateClientProps {
  organizationId: string;
  initialDashboard?: EmployeePortalDashboard;
}

export function OrganizationDashboardGateClient({
  organizationId,
  initialDashboard,
}: OrganizationDashboardGateClientProps) {
  return (
    <OrganizationDashboardClient
      organizationId={organizationId}
      initialDashboard={initialDashboard}
    />
  );
}
