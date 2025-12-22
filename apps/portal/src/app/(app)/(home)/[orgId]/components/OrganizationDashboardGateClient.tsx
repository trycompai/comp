'use client';

import { useSession } from '@/app/lib/auth-client';
import { useRouter } from 'next/navigation';
import * as React from 'react';
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
  const router = useRouter();
  const { data, isPending } = useSession();

  React.useEffect(() => {
    if (isPending) return;
    if (!data?.user) {
      router.replace('/auth');
    }
  }, [data?.user, isPending, router]);

  if (isPending) return null;
  if (!data?.user) return null;

  return (
    <OrganizationDashboardClient
      organizationId={organizationId}
      initialDashboard={initialDashboard}
    />
  );
}
