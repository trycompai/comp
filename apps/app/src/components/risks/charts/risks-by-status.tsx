import { auth } from '@/utils/auth';
import { Card, CardContent, CardHeader, CardTitle } from '@comp/ui/card';
import { db } from '@db';
import { headers } from 'next/headers';
import { cache } from 'react';
import { StatusChart } from './status-chart';

export async function RisksByStatus() {
  const risks = await getRisksByStatus();

  const data = risks.map((risk) => ({
    name: risk.status,
    value: risk._count,
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>{'Risks by Status'}</CardTitle>
      </CardHeader>
      <CardContent>
        <StatusChart data={data} />
      </CardContent>
    </Card>
  );
}

const getRisksByStatus = cache(async () => {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session || !session.session.activeOrganizationId) {
    return [];
  }

  const risks = await db.risk.groupBy({
    by: ['status'],
    where: { organizationId: session.session.activeOrganizationId },
    _count: true,
  });

  return risks;
});
