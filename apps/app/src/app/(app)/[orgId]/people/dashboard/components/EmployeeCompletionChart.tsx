'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@comp/ui/card';
import { Input } from '@comp/ui/input';
import { ExternalLink, Search } from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import type { CSSProperties } from 'react';
import * as React from 'react';

// Use correct types from the database
import { TrainingVideo } from '@/lib/data/training-videos';
import { EmployeeTrainingVideoCompletion, Member, Policy, User } from '@db';

interface EmployeeCompletionChartProps {
  employees: (Member & {
    user: User;
  })[];
  policies: Policy[];
  trainingVideos: (EmployeeTrainingVideoCompletion & {
    metadata: TrainingVideo;
  })[];
  showAll?: boolean;
}

// Define colors for the chart
const taskColors = {
  completed: 'bg-primary', // Green/Blue
  incomplete: 'bg-[var(--chart-open)]', // Yellow
};

interface EmployeeTaskStats {
  id: string;
  name: string;
  email: string;
  totalTasks: number;
  policiesCompleted: number;
  trainingsCompleted: number;
  policiesTotal: number;
  trainingsTotal: number;
  policyPercentage: number;
  trainingPercentage: number;
  overallPercentage: number;
}

export function EmployeeCompletionChart({
  employees,
  policies,
  trainingVideos,
  showAll = false,
}: EmployeeCompletionChartProps) {
  const params = useParams();
  const orgId = params.orgId as string;
  const [searchTerm, setSearchTerm] = React.useState('');
  const [displayedItems, setDisplayedItems] = React.useState(showAll ? 20 : 5);
  const [isLoading, setIsLoading] = React.useState(false);
  // Calculate completion data for each employee
  const employeeStats: EmployeeTaskStats[] = React.useMemo(() => {
    return employees.map((employee) => {
      // Count policies completed by this employee
      const policiesCompletedCount = policies.filter((policy) =>
        policy.signedBy.includes(employee.id),
      ).length;

      // Calculate policy completion percentage
      const policyCompletionPercentage = policies.length
        ? Math.round((policiesCompletedCount / policies.length) * 100)
        : 0;

      // Count training videos completed by this employee
      const employeeTrainingVideos = trainingVideos.filter(
        (video) => video.memberId === employee.id && video.completedAt !== null,
      );
      const trainingsCompletedCount = employeeTrainingVideos.length;

      // Get the total unique training videos available
      const uniqueTrainingVideosIds = [
        ...new Set(trainingVideos.map((video) => video.metadata.id)),
      ];
      const trainingVideosTotal = uniqueTrainingVideosIds.length;

      // Calculate training completion percentage
      const trainingCompletionPercentage = trainingVideosTotal
        ? Math.round((trainingsCompletedCount / trainingVideosTotal) * 100)
        : 0;

      // Calculate total completion percentage
      const totalItems = policies.length + trainingVideosTotal;
      const totalCompletedItems = policiesCompletedCount + trainingsCompletedCount;

      const overallPercentage = totalItems
        ? Math.round((totalCompletedItems / totalItems) * 100)
        : 0;

      return {
        id: employee.id,
        name: employee.user.name || employee.user.email.split('@')[0],
        email: employee.user.email,
        totalTasks: totalItems,
        policiesCompleted: policiesCompletedCount,
        trainingsCompleted: trainingsCompletedCount,
        policiesTotal: policies.length,
        trainingsTotal: trainingVideosTotal,
        policyPercentage: policyCompletionPercentage,
        trainingPercentage: trainingCompletionPercentage,
        overallPercentage,
      };
    });
  }, [employees, policies, trainingVideos]);

  // Filter employees based on search term
  const filteredStats = React.useMemo(() => {
    if (!searchTerm) return employeeStats;

    return employeeStats.filter(
      (stat) =>
        stat.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        stat.email.toLowerCase().includes(searchTerm.toLowerCase()),
    );
  }, [employeeStats, searchTerm]);

  // Sort and limit employees
  const sortedStats = React.useMemo(() => {
    const sorted = [...filteredStats].sort((a, b) => b.overallPercentage - a.overallPercentage);
    return showAll ? sorted.slice(0, displayedItems) : sorted.slice(0, 5);
  }, [filteredStats, displayedItems, showAll]);

  // Load more function for infinite scroll
  const loadMore = React.useCallback(async () => {
    if (isLoading || !showAll) return;

    setIsLoading(true);
    // Simulate loading delay
    await new Promise((resolve) => setTimeout(resolve, 300));
    setDisplayedItems((prev) => prev + 20);
    setIsLoading(false);
  }, [isLoading, showAll]);

  // Infinite scroll effect
  React.useEffect(() => {
    if (!showAll) return;

    const handleScroll = () => {
      if (
        window.innerHeight + document.documentElement.scrollTop >=
        document.documentElement.offsetHeight - 1000
      ) {
        loadMore();
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [loadMore, showAll]);

  // Check for empty data scenarios
  if (!employees.length) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{'Employee Task Completion'}</CardTitle>
        </CardHeader>
        <CardContent className="flex h-[300px] items-center justify-center">
          <p className="text-muted-foreground text-center text-sm">
            {'No employee data available'}
          </p>
        </CardContent>
      </Card>
    );
  }

  // Check if there are any tasks to complete
  if (policies.length === 0 && !trainingVideos.length) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{'Employee Task Completion'}</CardTitle>
        </CardHeader>
        <CardContent className="flex h-[300px] items-center justify-center">
          <p className="text-muted-foreground text-center text-sm">
            {'No tasks available to complete'}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{'Employee Task Completion'}</CardTitle>
        {showAll && (
          <div className="mt-4">
            <Input
              placeholder="Search employees..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              leftIcon={<Search className="h-4 w-4" />}
            />
          </div>
        )}
      </CardHeader>
      <CardContent>
        {filteredStats.length === 0 ? (
          <div className="flex h-[200px] items-center justify-center">
            <p className="text-muted-foreground text-center text-sm">
              {searchTerm ? 'No employees found matching your search' : 'No employees available'}
            </p>
          </div>
        ) : (
          <>
            <div className="space-y-8">
              {sortedStats.map((stat) => (
                <div key={stat.id} className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{stat.name}</p>
                        <Link
                          href={`/${orgId}/people/${stat.id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary hover:text-primary/80 flex items-center gap-1 text-xs font-medium underline-offset-4 hover:underline"
                        >
                          View Profile
                          <ExternalLink className="h-3 w-3" />
                        </Link>
                      </div>
                      <p className="text-muted-foreground text-xs">{stat.email}</p>
                    </div>
                    <div className="text-muted-foreground text-right text-xs">
                      <div>
                        {stat.policiesCompleted + stat.trainingsCompleted} / {stat.totalTasks} tasks
                      </div>
                      <div className="text-xs">
                        {stat.policiesCompleted}/{stat.policiesTotal} policies •{' '}
                        {stat.trainingsCompleted}/{stat.trainingsTotal} training
                      </div>
                    </div>
                  </div>

                  <TaskBarChart stat={stat} />

                  <div className="text-muted-foreground flex flex-wrap gap-3 text-xs">
                    <div className="flex items-center gap-1">
                      <div className="bg-primary size-2 rounded-xs" />
                      <span>{'Completed'}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="size-2 rounded-xs bg-[var(--chart-open)]" />
                      <span>{'Not Completed'}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {showAll && sortedStats.length < filteredStats.length && (
              <div className="mt-8 flex justify-center">
                {isLoading ? (
                  <div className="text-muted-foreground text-sm">Loading more employees...</div>
                ) : (
                  <button
                    onClick={loadMore}
                    className="text-primary hover:text-primary/80 text-sm font-medium"
                  >
                    Load more employees
                  </button>
                )}
              </div>
            )}

            {showAll && (
              <div className="mt-4 text-center text-muted-foreground text-xs">
                Showing {sortedStats.length} of {filteredStats.length} employees
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

function TaskBarChart({ stat }: { stat: EmployeeTaskStats }) {
  const totalCompleted = stat.policiesCompleted + stat.trainingsCompleted;
  const totalIncomplete = stat.totalTasks - totalCompleted;
  const barHeight = 12;

  // Empty chart for no tasks
  if (stat.totalTasks === 0) {
    return <div className="bg-muted h-3" />;
  }

  return (
    <div
      className="relative h-[var(--height)]"
      style={{ '--height': `${barHeight}px` } as CSSProperties}
    >
      <div className="absolute inset-0 h-full w-full overflow-visible">
        {/* Completed segment */}
        {totalCompleted > 0 && (
          <div
            className="absolute"
            style={{
              width: `${(totalCompleted / stat.totalTasks) * 100}%`,
              height: `${barHeight}px`,
              left: '0%',
            }}
          >
            <div
              className={taskColors.completed}
              style={{
                width: '100%',
                height: '100%',
              }}
              title={`Completed: ${totalCompleted}`}
            />
          </div>
        )}

        {/* Incomplete segment */}
        {totalIncomplete > 0 && (
          <div
            className="absolute"
            style={{
              width: `${(totalIncomplete / stat.totalTasks) * 100}%`,
              height: `${barHeight}px`,
              left: `${(totalCompleted / stat.totalTasks) * 100}%`,
            }}
          >
            <div
              className={taskColors.incomplete}
              style={{
                width: '100%',
                height: '100%',
              }}
              title={`Incomplete: ${totalIncomplete}`}
            />
          </div>
        )}
      </div>
    </div>
  );
}
