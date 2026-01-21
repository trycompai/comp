'use client';

import { Grid } from '@trycompai/design-system';
import {
  type PoliciesOverview,
  usePoliciesOverview,
} from '../hooks/usePoliciesOverview';
import { PolicyAssigneeChart } from './policy-assignee-chart';
import { PolicyStatusChart } from './policy-status-chart';

interface PolicyChartsClientProps {
  organizationId: string;
  initialData: PoliciesOverview | null;
}

export function PolicyChartsClient({
  organizationId,
  initialData,
}: PolicyChartsClientProps) {
  const { overview } = usePoliciesOverview({
    organizationId,
    initialData,
  });

  return (
    <Grid cols={{ base: '1', lg: '2' }} gap="4" align="start">
      <PolicyStatusChart data={overview} />
      <PolicyAssigneeChart data={overview?.assigneeData} />
    </Grid>
  );
}
