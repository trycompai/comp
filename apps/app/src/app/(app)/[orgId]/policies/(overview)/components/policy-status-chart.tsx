'use client';

import * as React from 'react';
import { Label, Pie, PieChart } from 'recharts';

import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@comp/ui/chart';
import { Badge, Card, CardContent, CardFooter, HStack, Stack, Text } from '@trycompai/design-system';
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
  archived: 'oklch(0.556 0 0)', // --muted-foreground (gray)
  needs_review: 'oklch(0.58 0.22 27)', // --destructive (red)
};

// Custom tooltip component for the pie chart
const StatusTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-background rounded-sm border p-2 shadow-md">
        <p className="text-xs font-medium">{data.name}</p>
        <p className="text-xs">
          Count: <span className="font-medium">{data.value}</span>
        </p>
      </div>
    );
  }
  return null;
};

export function PolicyStatusChart({ data }: PolicyStatusChartProps) {
  // All statuses for the legend (always show all)
  const allStatuses = React.useMemo(() => {
    if (!data) return [];
    return [
      {
        name: 'Published',
        value: data.publishedPolicies,
        fill: CHART_COLORS.published,
      },
      {
        name: 'Draft',
        value: data.draftPolicies,
        fill: CHART_COLORS.draft,
      },
      {
        name: 'Needs Review',
        value: data.needsReviewPolicies,
        fill: CHART_COLORS.needs_review,
      },
      {
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

  // Calculate most common status
  const mostCommonStatus = React.useMemo(() => {
    if (!chartData.length) return null;
    return chartData.reduce((prev, current) => (prev.value > current.value ? prev : current));
  }, [chartData]);

  if (!data) {
    return (
      <Card title="Policy by Status" width="full">
        <Stack gap="md" align="center">
          <Information size={40} className="text-muted-foreground opacity-30" />
          <Text size="sm" variant="muted">
            No policy data available
          </Text>
        </Stack>
      </Card>
    );
  }

  const chartConfig = {
    value: {
      label: 'Count',
    },
  } satisfies ChartConfig;

  return (
    <Card title="Policy by Status" width="full">
      <Stack gap="md">
        <ChartContainer config={chartConfig} className="mx-auto h-[200px] max-w-[175px]">
          <PieChart
            width={175}
            height={200}
            margin={{
              top: 12,
              right: 12,
              bottom: 12,
              left: 12,
            }}
          >
            <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
            <Pie
              data={chartData}
              dataKey="value"
              nameKey="name"
              innerRadius={42}
              outerRadius={56}
              paddingAngle={2}
              strokeWidth={3}
              stroke="hsl(var(--background))"
              cursor="pointer"
              animationDuration={500}
              animationBegin={100}
            >
              <Label
                content={({ viewBox }) => {
                  if (viewBox && 'cx' in viewBox && 'cy' in viewBox) {
                    return (
                      <g>
                        <text
                          x={viewBox.cx}
                          y={viewBox.cy}
                          textAnchor="middle"
                          dominantBaseline="middle"
                        >
                          <tspan
                            x={viewBox.cx}
                            y={viewBox.cy}
                            className="fill-foreground text-xl font-bold"
                          >
                            {data.totalPolicies}
                          </tspan>
                          <tspan
                            x={viewBox.cx}
                            y={(viewBox.cy || 0) + 18}
                            className="fill-muted-foreground text-[10px]"
                          >
                            Policies
                          </tspan>
                        </text>
                        <circle
                          cx={viewBox.cx}
                          cy={viewBox.cy}
                          r={38}
                          fill="none"
                          stroke="hsl(var(--border))"
                          strokeWidth={1}
                          strokeDasharray="2,2"
                        />
                      </g>
                    );
                  }
                  return null;
                }}
              />
            </Pie>
          </PieChart>
        </ChartContainer>
        <HStack justify="center" gap="md">
          {allStatuses.map((entry) => (
            <HStack key={entry.name} gap="xs" align="center">
              <div className="h-3 w-3" style={{ backgroundColor: entry.fill }} />
              <Text size="xs" weight="medium">
                {entry.name}
                <Text as="span" size="xs" variant="muted">
                  {' '}
                  ({entry.value})
                </Text>
              </Text>
            </HStack>
          ))}
        </HStack>
      </Stack>
    </Card>
  );
}
