'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@comp/ui/card';
import { Progress } from '@comp/ui/progress';
import { FrameworkInstance } from '@db';
import { ComplianceProgressChart } from './ComplianceProgressChart';
import { PeopleChart } from './PeopleChart';
import { PoliciesChart } from './PoliciesChart';
import { TasksChart } from './TasksChart';

export function ComplianceOverview({
  frameworks,
  totalPolicies,
  publishedPolicies,
  totalTasks,
  doneTasks,
  totalMembers,
  completedMembers,
}: {
  frameworks: FrameworkInstance[];
  totalPolicies: number;
  publishedPolicies: number;
  totalTasks: number;
  doneTasks: number;
  totalMembers: number;
  completedMembers: number;
}) {
  const compliancePercentage = complianceProgress(
    publishedPolicies,
    doneTasks,
    totalPolicies,
    totalTasks,
    totalMembers,
    completedMembers,
  );

  const policiesPercentage = Math.round((publishedPolicies / Math.max(totalPolicies, 1)) * 100);
  const tasksPercentage = Math.round((doneTasks / Math.max(totalTasks, 1)) * 100);
  const peoplePercentage = Math.round((completedMembers / Math.max(totalMembers, 1)) * 100);

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
      <CardContent className="flex flex-col flex-1 justify-center">
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

          {/* People Progress Bar */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-green-500"></div>
                <span className="text-sm">People Score</span>
              </div>
              <span className="font-medium text-sm tabular-nums">{peoplePercentage}%</span>
            </div>
            <Progress value={peoplePercentage} className="h-1" />
          </div>
        </div>

        {/* Charts for larger screens */}
        <div className="hidden lg:flex lg:flex-col lg:items-center lg:justify-center lg:gap-4">
          <ComplianceProgressChart
            data={{ score: compliancePercentage, remaining: 100 - compliancePercentage }}
          />
          <div className="flex flex-row items-center justify-center gap-3">
            <div className="flex flex-col items-center justify-center">
              <PoliciesChart
                data={{ published: policiesPercentage, draft: 100 - policiesPercentage }}
              />
            </div>
            <div className="flex flex-col items-center justify-center">
              <TasksChart data={{ done: tasksPercentage, remaining: 100 - tasksPercentage }} />
            </div>
            <div className="flex flex-col items-center justify-center">
              <PeopleChart
                data={{ completed: peoplePercentage, remaining: 100 - peoplePercentage }}
              />
            </div>
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
  totalMembers: number,
  completedMembers: number,
) {
  // Calculate individual percentages
  const policiesPercentage = totalPolicies > 0 ? publishedPolicies / totalPolicies : 0;
  const tasksPercentage = totalTasks > 0 ? doneTasks / totalTasks : 0;
  const peoplePercentage = totalMembers > 0 ? completedMembers / totalMembers : 0;

  // Calculate average of the three percentages
  const totalCategories = [totalPolicies, totalTasks, totalMembers].filter(
    (count) => count > 0,
  ).length;

  if (totalCategories === 0) return 0;

  const averagePercentage =
    (policiesPercentage + tasksPercentage + peoplePercentage) / totalCategories;
  const complianceScore = Math.round(averagePercentage * 100);

  return complianceScore;
}
