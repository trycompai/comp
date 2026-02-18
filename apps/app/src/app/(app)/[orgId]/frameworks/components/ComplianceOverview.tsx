'use client';

import { Catalog, Group, ListChecked, Policy } from '@carbon/icons-react';
import { Card, CardContent, CardHeader, CardTitle } from '@comp/ui/card';
import { Button } from '@trycompai/design-system';
import { ArrowRight } from '@trycompai/design-system/icons';
import { useRouter } from 'next/navigation';

export function ComplianceOverview({
  organizationId,
  overallComplianceScore,
  totalPolicies,
  publishedPolicies,
  totalTasks,
  doneTasks,
  totalDocuments,
  completedDocuments,
  totalMembers,
  completedMembers,
}: {
  organizationId: string;
  overallComplianceScore: number;
  totalPolicies: number;
  publishedPolicies: number;
  totalTasks: number;
  doneTasks: number;
  totalDocuments: number;
  completedDocuments: number;
  totalMembers: number;
  completedMembers: number;
}) {
  const router = useRouter();

  const metrics = [
    {
      id: 'policies',
      label: 'Policies',
      subtitle: `${publishedPolicies}/${totalPolicies} policies published`,
      percentage: getPercentage(publishedPolicies, totalPolicies),
      icon: Policy,
      total: totalPolicies,
      href: `/${organizationId}/policies`,
    },
    {
      id: 'tasks',
      label: 'Evidence',
      subtitle: `${doneTasks}/${totalTasks} evidence tasks complete`,
      percentage: getPercentage(doneTasks, totalTasks),
      icon: ListChecked,
      total: totalTasks,
      href: `/${organizationId}/tasks`,
    },
    {
      id: 'documents',
      label: 'Documents',
      subtitle: `${completedDocuments}/${totalDocuments} documents up to date`,
      percentage: getPercentage(completedDocuments, totalDocuments),
      icon: Catalog,
      total: totalDocuments,
      href: `/${organizationId}/documents`,
    },
    {
      id: 'people',
      label: 'People',
      subtitle: `${completedMembers}/${totalMembers} people complete`,
      percentage: getPercentage(completedMembers, totalMembers),
      icon: Group,
      total: totalMembers,
      href: `/${organizationId}/people/all`,
    },
  ] as const;

  const compliancePercentage = overallComplianceScore;

  return (
    <Card className="flex h-full flex-col overflow-hidden border">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">Overall Compliance Progress</CardTitle>
        </div>
        <div className="bg-secondary/50 relative mt-2 h-1 w-full overflow-hidden rounded-full">
          <div
            className="bg-primary h-full transition-all"
            style={{
              width: `${compliancePercentage}%`,
            }}
          />
        </div>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col p-0">
        <div className="divide-y divide-border">
          {metrics.map((metric) => {
            const Icon = metric.icon;
            return (
              <div key={metric.id} className="flex items-center justify-between px-4 py-3">
                <div className="flex min-w-0 items-center gap-2 sm:gap-3">
                  <div className="hidden h-9 w-9 place-items-center rounded-md border border-border/70 bg-muted/30 sm:grid">
                    <Icon className="h-4 w-4 text-foreground" />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-foreground">{metric.label}</p>
                    <p className="truncate text-xs text-muted-foreground">{metric.subtitle}</p>
                    {metric.percentage < 100 && (
                      <div className="mt-1 md:hidden">
                        <Button variant="link" onClick={() => router.push(metric.href)}>
                          Continue
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {metric.percentage < 100 && (
                    <div className="hidden md:block">
                      <Button
                        size="sm"
                        variant="outline"
                        iconRight={<ArrowRight size={14} />}
                        onClick={() => router.push(metric.href)}
                      >
                        Continue
                      </Button>
                    </div>
                  )}
                  <MiniProgressRing percentage={metric.percentage} />
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

function getPercentage(done: number, total: number): number {
  if (total <= 0) return 0;
  return Math.round((done / total) * 100);
}

function MiniProgressRing({ percentage }: { percentage: number }) {
  const clamped = Math.max(0, Math.min(100, percentage));
  const radius = 18;
  const stroke = 4;
  const normalizedRadius = radius - stroke / 2;
  const circumference = normalizedRadius * 2 * Math.PI;
  const strokeDashoffset = circumference - (clamped / 100) * circumference;

  return (
    <div className="relative h-14 w-14 shrink-0">
      <svg className="h-14 w-14 -rotate-90" viewBox="0 0 36 36">
        <circle
          cx="18"
          cy="18"
          r={normalizedRadius}
          stroke="currentColor"
          strokeWidth={stroke}
          fill="transparent"
          className="text-muted/70"
        />
        <circle
          cx="18"
          cy="18"
          r={normalizedRadius}
          stroke="currentColor"
          strokeWidth={stroke}
          fill="transparent"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          className="text-primary transition-all duration-500 ease-out"
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center text-[11px] font-semibold tabular-nums text-foreground">
        {clamped}%
      </div>
    </div>
  );
}
