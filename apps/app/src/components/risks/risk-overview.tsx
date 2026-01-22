'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@comp/ui/card';
import type { Member, Risk, User } from '@db';
import { Button } from '@trycompai/design-system';
import { Edit } from '@trycompai/design-system/icons';
import { useState } from 'react';
import { UpdateRiskOverview } from '../forms/risks/risk-overview';
import { RiskOverviewSheet } from '../sheets/risk-overview-sheet';

export function RiskOverview({
  risk,
  assignees,
}: {
  risk: Risk & { assignee: { user: User } | null };
  assignees: (Member & { user: User })[];
}) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <CardTitle>{risk.title}</CardTitle>
            <Button size="icon-xs" variant="ghost" onClick={() => setIsOpen(true)}>
              <Edit size={12} />
            </Button>
          </div>
          <CardDescription>{risk.description}</CardDescription>
        </div>
      </CardHeader>
      <CardContent>
        <UpdateRiskOverview risk={risk} assignees={assignees} />
      </CardContent>
      <RiskOverviewSheet risk={risk} open={isOpen} onOpenChange={setIsOpen} />
    </Card>
  );
}
