'use client';

import { Card, CardContent } from '@comp/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@comp/ui/select';
import { EvidenceAutomationRun, EvidenceAutomationVersion } from '@db';
import { Clock } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useAutomationVersions } from '../../../../automation/[automationId]/hooks/use-automation-versions';

interface MetricsSectionProps {
  automationName: string;
  initialVersions: EvidenceAutomationVersion[];
  initialRuns: EvidenceAutomationRun[];
}

export function MetricsSection({
  automationName,
  initialVersions,
  initialRuns,
}: MetricsSectionProps) {
  const {
    versions,
    hasMore,
    loadMore,
    isLoading: loadingVersions,
  } = useAutomationVersions({
    initialData: initialVersions,
  });

  // Initialize with latest version or draft (no loading flicker)
  const [selectedVersion, setSelectedVersion] = useState<string>(
    initialVersions.length > 0 ? initialVersions[0].version.toString() : 'draft',
  );

  // Filter runs by selected version
  const filteredRuns = useMemo(() => {
    if (selectedVersion === 'draft') {
      return initialRuns.filter((run) => run.version === null);
    }
    return initialRuns.filter((run) => run.version === parseInt(selectedVersion));
  }, [selectedVersion, initialRuns]);

  // Calculate metrics from filtered runs
  const totalRuns = filteredRuns.length;
  const successfulRuns = filteredRuns.filter((run) => run.status === 'completed').length;
  const successRate = totalRuns > 0 ? Math.round((successfulRuns / totalRuns) * 100) : 0;
  const latestRun = filteredRuns[0];

  return (
    <div className="flex flex-col gap-6 bg-secondary p-8">
      <div className="flex items-center justify-between">
        <div className="text-xl font-medium">{automationName}</div>
        <Select value={selectedVersion} onValueChange={setSelectedVersion}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Select version" />
          </SelectTrigger>
          <SelectContent className="max-h-[300px]">
            <div className="max-h-[200px] overflow-y-auto">
              {versions?.map((version, index) => (
                <SelectItem key={version.id} value={version.version.toString()}>
                  Version {version.version} {index === 0 ? '(Latest)' : ''}
                </SelectItem>
              ))}

              {hasMore && (
                <div
                  className="relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground"
                  onClick={(e) => {
                    e.stopPropagation();
                    loadMore();
                  }}
                >
                  <span className="text-muted-foreground">
                    {loadingVersions ? 'Loading...' : 'Load 10 more...'}
                  </span>
                </div>
              )}
            </div>

            <SelectItem value="draft">Draft</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6 min-h-[120px]">
            <p className="text-sm text-muted-foreground mb-2">Success Rate</p>
            <div className="flex items-baseline gap-2">
              <p className="text-3xl font-semibold text-chart-positive">{successRate}%</p>
              <p className="text-sm text-muted-foreground">Avg.</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6 min-h-[120px]">
            <p className="text-sm text-muted-foreground mb-2">Schedule</p>
            <div className="text-base font-medium flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Every Day 9:00 AM
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6 min-h-[120px]">
            <p className="text-sm text-muted-foreground mb-2">Next Run</p>
            <p className="text-base font-medium">Tomorrow 9:00 AM</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6 min-h-[120px]">
            <p className="text-sm text-muted-foreground mb-2">Last Run</p>
            {latestRun ? (
              <>
                <p className="text-base font-medium">
                  {new Date(latestRun.createdAt).toLocaleTimeString([], {
                    hour: 'numeric',
                    minute: '2-digit',
                  })}
                </p>
                <div className="flex items-center gap-2 mt-1">
                  <span
                    className={`text-xs font-medium ${
                      latestRun.status === 'completed'
                        ? 'text-chart-positive'
                        : 'text-chart-destructive'
                    }`}
                  >
                    {latestRun.status === 'completed' ? 'Complete' : 'Failed'}
                  </span>
                  <span className="text-xs text-muted-foreground">• 2s</span>
                </div>
              </>
            ) : (
              <p className="text-base text-muted-foreground">No runs yet</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
