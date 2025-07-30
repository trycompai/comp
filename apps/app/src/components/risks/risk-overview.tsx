'use client';

import { Button } from '@comp/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@comp/ui/card';
import type { Member, Risk, User } from '@db';
import { PencilIcon } from 'lucide-react';
import { useQueryState } from 'nuqs';
import { UpdateRiskOverview } from '../forms/risks/risk-overview';
import { RiskOverviewSheet } from '../sheets/risk-overview-sheet';

export function RiskOverview({
  risk,
  assignees,
}: {
  risk: Risk & { assignee: { user: User } | null };
  assignees: (Member & { user: User })[];
}) {
  const [open, setOpen] = useQueryState('risk-overview-sheet');

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <CardTitle>{risk.title}</CardTitle>
            <Button
              size="icon"
              variant="ghost"
              className="m-0 size-auto p-0 hover:bg-transparent"
              onClick={() => setOpen('true')}
            >
              <PencilIcon className="h-3 w-3" />
            </Button>
          </div>
          <CardDescription>{risk.description}</CardDescription>
        </div>
      </CardHeader>
      <CardContent>
        <UpdateRiskOverview risk={risk} assignees={assignees} />
      </CardContent>
      <RiskOverviewSheet risk={risk} />
    </Card>
  );
}
