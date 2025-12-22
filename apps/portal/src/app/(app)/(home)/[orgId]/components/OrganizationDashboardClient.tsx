'use client';

import { useRouter } from 'next/navigation';
import * as React from 'react';
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
  const router = useRouter();
  const { data, error, isLoading } = useEmployeePortalOverview({
    organizationId,
    initialDashboard,
  });

  React.useEffect(() => {
    if (!data?.error) return;
    // Treat auth failures as "go sign in". This avoids server-side loops after Google OAuth.
    if (data.status === 401 || data.error.toLowerCase().includes('jwt')) {
      router.replace('/auth');
    }
  }, [data?.error, data?.status, router]);

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
