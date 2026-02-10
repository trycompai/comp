import { serverApi } from '@/lib/api-server';
import { Card, CardContent, CardHeader, CardTitle } from '@comp/ui/card';
import type { CSSProperties } from 'react';

interface Props {
  organizationId: string;
}

interface UserTestStats {
  user: {
    id: string;
    name: string | null;
    email: string | null;
    image: string | null;
  };
  totalTests: number;
  passedTests: number;
  failedTests: number;
  unsupportedTests: number;
}

const testStatus = {
  passed: 'bg-[var(--chart-closed)]',
  failed: 'bg-[hsl(var(--destructive))]',
  unsupported: 'bg-[hsl(var(--muted-foreground))]',
};

export async function TestsByAssignee({ organizationId }: Props) {
  const res = await serverApi.get<{ data: UserTestStats[] }>(
    '/v1/people/test-stats/by-assignee',
  );
  const stats = Array.isArray(res.data?.data) ? res.data.data : [];
  stats.sort((a, b) => b.totalTests - a.totalTests);

  return (
    <Card>
      <CardHeader>
        <CardTitle>{'Tests by Assignee'}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-8">
          {stats.map((stat) => (
            <div key={stat.user.id} className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-sm">{stat.user.name || stat.user.email || 'Unknown User'}</p>
                <span className="text-muted-foreground text-sm">{stat.totalTests} Tests</span>
              </div>

              <TestBarChart stat={stat} />

              <div className="text-muted-foreground flex flex-wrap gap-3 text-xs">
                <div className="flex items-center gap-1">
                  <div className="size-2 bg-[var(--chart-success)]" />
                  <span>
                    {'Passed'} ({stat.passedTests})
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="size-2 bg-[hsl(var(--destructive))]" />
                  <span>
                    {'Failed'} ({stat.failedTests})
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="size-2 bg-[hsl(var(--muted-foreground))]" />
                  <span>Unsupported ({stat.unsupportedTests})</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function TestBarChart({ stat }: { stat: UserTestStats }) {
  const data = [
    ...(stat.passedTests > 0
      ? [{ key: 'passed', value: stat.passedTests, color: testStatus.passed, label: 'passed' }]
      : []),
    ...(stat.failedTests > 0
      ? [{ key: 'failed', value: stat.failedTests, color: testStatus.failed, label: 'failed' }]
      : []),
    ...(stat.unsupportedTests > 0
      ? [{ key: 'unsupported', value: stat.unsupportedTests, color: testStatus.unsupported, label: 'unsupported' }]
      : []),
  ];

  const gap = 0.3;
  const totalValue = stat.totalTests;
  const barHeight = 12;
  const totalWidth = totalValue + gap * (data.length - 1);
  let cumulativeWidth = 0;
  const cornerRadius = 0;

  if (totalValue === 0) {
    return <div className="bg-muted h-3" />;
  }

  return (
    <div
      className="relative h-[var(--height)]"
      style={
        {
          '--marginTop': '0px',
          '--marginRight': '0px',
          '--marginBottom': '0px',
          '--marginLeft': '0px',
          '--height': `${barHeight}px`,
        } as CSSProperties
      }
    >
      <div className="absolute inset-0 h-[calc(100%-var(--marginTop)-var(--marginBottom))] w-[calc(100%-var(--marginLeft)-var(--marginRight))] translate-x-[var(--marginLeft)] translate-y-[var(--marginTop)] overflow-visible">
        {data.map((d) => {
          const barWidth = (d.value / totalWidth) * 100;
          const xPosition = cumulativeWidth;
          cumulativeWidth += barWidth + gap;

          return (
            <div
              key={d.key}
              className="relative"
              style={{
                width: `${barWidth}%`,
                height: `${barHeight}px`,
                left: `${xPosition}%`,
                position: 'absolute',
              }}
            >
              <div
                className={`bg-gradient-to-b ${d.color}`}
                style={{
                  width: '100%',
                  height: '100%',
                  borderRadius: `${cornerRadius}px`,
                }}
                title={`${d.label}: ${d.value}`}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
