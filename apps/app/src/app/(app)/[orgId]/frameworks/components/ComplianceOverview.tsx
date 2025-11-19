'use client';

import { FrameworkInstance } from '@trycompai/db';
import { Card, CardContent, CardHeader, CardTitle } from '@trycompai/ui/card';
import { Progress } from '@trycompai/ui/progress';
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
            className="bg-primary h-full transition-all"
            style={{
              width: `${compliancePercentage}%`,
            }}
          />
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {/* Progress bars for smaller screens */}
        <div className="space-y-4 lg:hidden mt-4">
          {/* Overall Compliance Progress Bar */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-primary"></div>
                <span className="text-sm">Overall Compliance</span>
              </div>
              <span className="font-medium text-sm tabular-nums">{compliancePercentage}%</span>
            </div>
            <Progress value={compliancePercentage} className="h-1" />
          </div>

          {/* Policies Progress Bar */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-blue-500"></div>
                <span className="text-sm">Policies Published</span>
              </div>
              <span className="font-medium text-sm tabular-nums">{policiesPercentage}%</span>
            </div>
            <Progress value={policiesPercentage} className="h-1" />
          </div>

          {/* Tasks Progress Bar */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-yellow-500"></div>
                <span className="text-sm">Tasks Completed</span>
              </div>
              <span className="font-medium text-sm tabular-nums">{tasksPercentage}%</span>
            </div>
            <Progress value={tasksPercentage} className="h-1" />
          </div>
        </div>

        {/* Charts for larger screens */}
        <div className="hidden lg:flex lg:flex-col lg:items-center lg:justify-center">
          <ComplianceProgressChart
            data={{ score: compliancePercentage, remaining: 100 - compliancePercentage }}
          />
        </div>

        <div className="hidden lg:flex lg:flex-col lg:items-center lg:justify-center lg:gap-3 lg:flex-row lg:gap-6">
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
