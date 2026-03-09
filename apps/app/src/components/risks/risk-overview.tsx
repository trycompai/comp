'use client';

import type { Member, Risk, User } from '@db';
import { Section } from '@trycompai/design-system';
import { UpdateRiskOverview } from '../forms/risks/risk-overview';

export function RiskOverview({
  risk,
  assignees,
}: {
  risk: Risk & { assignee: { user: User } | null };
  assignees: (Member & { user: User })[];
}) {
  return (
    <Section title="Risk Settings">
      <UpdateRiskOverview risk={risk} assignees={assignees} />
    </Section>
  );
}
