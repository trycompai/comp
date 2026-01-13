'use client';

import * as React from 'react';
import { Label, Pie, PieChart } from 'recharts';

import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@comp/ui/chart';
import { Card, HStack, Stack, Text } from '@trycompai/design-system';
import { Information } from '@trycompai/design-system/icons';

interface PolicyOverviewData {
  totalPolicies: number;
  publishedPolicies: number;
  draftPolicies: number;
  archivedPolicies: number;
  needsReviewPolicies: number;
}

interface PolicyStatusChartProps {
  data?: PolicyOverviewData | null;
}

// Using oklch values from DS globals.css
const CHART_COLORS = {
  published: 'oklch(0.6 0.16 145)', // --success (green)
  draft: 'oklch(0.75 0.15 85)', // --warning (yellow)
  needs_review: 'oklch(0.58 0.22 27)', // --destructive (red)
  archived: 'oklch(0.556 0 0)', // --muted-foreground (gray)
};

const STATUS_LABELS: Record<string, string> = {
  published: 'Published',
  draft: 'Draft',
  needs_review: 'Review',
  archived: 'Archived',
};

export function PolicyStatusChart({ data }: PolicyStatusChartProps) {
  // All statuses for the legend (always show all)
  const allStatuses = React.useMemo(() => {
    if (!data) return [];
    return [
      {
        key: 'published',
        name: 'Published',
        value: data.publishedPolicies,
        fill: CHART_COLORS.published,
      },
      {
        key: 'draft',
        name: 'Draft',
        value: data.draftPolicies,
        fill: CHART_COLORS.draft,
      },
      {
        key: 'needs_review',
        name: 'Needs Review',
        value: data.needsReviewPolicies,
        fill: CHART_COLORS.needs_review,
      },
      {
        key: 'archived',
        name: 'Archived',
        value: data.archivedPolicies,
        fill: CHART_COLORS.archived,
      },
    ];
  }, [data]);

  // Only non-zero values for the pie chart
  const chartData = React.useMemo(() => {
    return allStatuses.filter((item) => item.value > 0);
  }, [allStatuses]);

  if (!data) {
    return (
      <Card title="Policy by Status" width="full" size="sm" spacing="tight">
        <div className="flex h-[120px] flex-col items-center justify-center gap-2">
          <Information size={20} className="text-muted-foreground opacity-30" />
          <Text size="xs" variant="muted">
            No policy data available
          </Text>
        </div>
      </Card>
    );
  }

  const chartConfig = {
    value: {
      label: 'Count',
    },
  } satisfies ChartConfig;

  return (
    <Card title="Policy by Status" width="full" size="sm" spacing="tight">
      <div className="flex h-[120px] items-center justify-center px-4">
        <HStack gap="lg" align="center">
          {/* Donut Chart */}
          <ChartContainer config={chartConfig} className="h-[100px] w-[100px] shrink-0">
            <PieChart width={100} height={100}>
              <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
              <Pie
                data={chartData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                innerRadius={34}
                outerRadius={46}
                paddingAngle={3}
                strokeWidth={2}
                stroke="hsl(var(--background))"
                cursor="pointer"
                animationDuration={500}
                animationBegin={100}
              >
                <Label
                  content={({ viewBox }) => {
                    if (viewBox && 'cx' in viewBox && 'cy' in viewBox) {
                      return (
                        <text
                          x={viewBox.cx}
                          y={viewBox.cy}
                          textAnchor="middle"
                          dominantBaseline="middle"
                        >
                          <tspan
                            x={viewBox.cx}
                            y={viewBox.cy}
                            className="fill-foreground text-lg font-bold"
                          >
                            {data.totalPolicies}
                          </tspan>
                        </text>
                      );
                    }
                    return null;
                  }}
                />
              </Pie>
            </PieChart>
          </ChartContainer>

          {/* Legend with counts */}
          <Stack gap="xs">
            {allStatuses.map((status) => (
              <HStack key={status.key} gap="sm" align="center">
                <div
                  className="h-2 w-2 rounded-full shrink-0"
                  style={{ backgroundColor: status.fill }}
                />
                <Text size="xs" variant="muted">
                  {status.name}
                </Text>
                <Text size="xs" weight="medium">
                  {status.value}
                </Text>
              </HStack>
            ))}
          </Stack>
        </HStack>
      </div>
      <div className="border-t border-border pt-3 mt-3">
        <HStack justify="end" align="center">
          <Text size="xs" variant="muted">
            {data.totalPolicies} total
          </Text>
        </HStack>
      </div>
    </Card>
  );
}
