'use client';

import { PieChart } from '@/components/ui/pie-chart';
import { Card, CardContent, CardHeader, CardTitle } from '@comp/ui/card';
import { cn } from '@comp/ui/cn';
import { T, useGT } from 'gt-next';
import type { InlineTranslationOptions } from 'gt-next/types';

interface Props {
  totalPolicies: number;
  publishedPolicies: number;
  draftPolicies: number;
  archivedPolicies: number;
  needsReviewPolicies: number;
}

const getPolicyStatusData = (t: (content: string, options?: InlineTranslationOptions) => string, statusCounts: any) => [
  {
    name: t('Published'),
    value: statusCounts.published,
    color: 'var(--chart-closed)',
    colorClass: 'bg-[var(--chart-closed)]',
  },
  {
    name: t('Draft'),
    value: statusCounts.draft,
    color: 'var(--chart-open)',
    colorClass: 'bg-[var(--chart-open)]',
  },
  {
    name: t('Archived'),
    value: statusCounts.archived,
    color: 'var(--chart-pending)',
    colorClass: 'bg-[var(--chart-pending)]',
  },
  {
    name: t('Needs Review'),
    value: statusCounts.needs_review,
    color: 'hsl(var(--destructive))',
    colorClass: 'bg-[hsl(var(--destructive))]',
  },
];

export function PoliciesStatus({
  totalPolicies,
  publishedPolicies,
  draftPolicies,
  archivedPolicies,
  needsReviewPolicies,
}: Props) {
  const t = useGT();
  const statusCounts = {
    published: publishedPolicies,
    draft: draftPolicies,
    archived: archivedPolicies,
    needs_review: needsReviewPolicies,
  };

  const data = getPolicyStatusData(t, statusCounts);

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('Policy by Status')}</CardTitle>
      </CardHeader>
      <CardContent>
        <PieChart data={data} />
        <div className="mt-4 gap-2 text-sm">
          {data.map((item) => (
            <div key={item.name} className="flex items-center gap-2">
              <div className={cn('h-3 w-3', item.colorClass)} />
              <span>{item.name}</span>
              <span className="ml-auto font-medium">{item.value}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
