'use client';

import { useTeamMembers } from '../../all/hooks/useTeamMembers';
import { useOrgChart } from '../hooks/useOrgChart';
import { OrgChartContent } from './OrgChartContent';
import type { OrgChartMember } from '../types';

interface OrgChartTabContentProps {
  organizationId: string;
}

export function OrgChartTabContent({ organizationId }: OrgChartTabContentProps) {
  const { orgChart } = useOrgChart();
  const { members } = useTeamMembers({ organizationId });

  const chartMembers: OrgChartMember[] = members
    .filter((m) => !m.deactivated && m.isActive)
    .map((m) => ({
      id: m.id,
      user: {
        name: m.user.name ?? '',
        email: m.user.email ?? '',
      },
      role: m.role ?? '',
      jobTitle: m.jobTitle ?? null,
    }));

  return <OrgChartContent chartData={orgChart} members={chartMembers} />;
}
