'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@comp/ui/card';
import { FrameworkInstance } from '@db';
import { ComplianceProgressChart } from './ComplianceProgressChart';
import { PoliciesChart } from './PoliciesChart';
import { TasksChart } from './TasksChart';

export function ComplianceOverview({
  frameworks,
  totalPolicies,
  publishedPolicies,
  totalTasks,
  doneTasks,
}: {
  frameworks: FrameworkInstance[];
  totalPolicies: number;
  publishedPolicies: number;
  totalTasks: number;
  doneTasks: number;
}) {
  const compliancePercentage = complianceProgress(
    publishedPolicies,
    doneTasks,
    totalPolicies,
    totalTasks,
  );

  const policiesPercentage = Math.round((publishedPolicies / Math.max(totalPolicies, 1)) * 100);
  const tasksPercentage = Math.round((doneTasks / Math.max(totalTasks, 1)) * 100);

  return (
    <Card className="flex flex-col overflow-hidden border h-full">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">{'Overall Compliance Progress'}</CardTitle>
        </div>

        <div className="bg-secondary/50 relative mt-2 h-1 w-full overflow-hidden rounded-full">
          <div
            className="bg-primary/80 h-full transition-all"
            style={{
              width: `${compliancePercentage}%`,
            }}
          />
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <div className="flex flex-col items-center justify-center">
          <ComplianceProgressChart
            data={{ score: compliancePercentage, remaining: 100 - compliancePercentage }}
          />
        </div>

        <div className="flex flex-col items-center justify-center gap-3 sm:flex-row sm:gap-6">
          <div className="flex flex-col items-center justify-center">
            <PoliciesChart
              data={{ published: policiesPercentage, draft: 100 - policiesPercentage }}
            />
          </div>
          <div className="flex flex-col items-center justify-center">
            <TasksChart data={{ done: tasksPercentage, remaining: 100 - tasksPercentage }} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function complianceProgress(
  publishedPolicies: number,
  doneTasks: number,
  totalPolicies: number,
  totalTasks: number,
) {
  const totalItems = totalPolicies + totalTasks;

  if (totalItems === 0) return 0;

  const completedItems = publishedPolicies + doneTasks;
  const complianceScore = Math.round((completedItems / totalItems) * 100);

  return complianceScore;
}
