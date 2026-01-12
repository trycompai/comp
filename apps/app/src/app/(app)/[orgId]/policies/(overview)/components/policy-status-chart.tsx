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
  const chartData = React.useMemo(() => {
    if (!data) return [];
    const items = [
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
    return items.filter((item) => item.value > 0);
  }, [data]);

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
        <ChartContainer config={chartConfig} className="mx-auto h-[300px] max-w-[250px]">
          <PieChart
            width={250}
            height={300}
            margin={{
              top: 16,
              right: 16,
              bottom: 16,
              left: 16,
            }}
          >
            <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
            <Pie
              data={chartData}
              dataKey="value"
              nameKey="name"
              innerRadius={60}
              outerRadius={80}
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
                            className="fill-foreground text-3xl font-bold"
                          >
                            {data.totalPolicies}
                          </tspan>
                          <tspan
                            x={viewBox.cx}
                            y={(viewBox.cy || 0) + 26}
                            className="fill-muted-foreground text-xs"
                          >
                            Policies
                          </tspan>
                        </text>
                        <circle
                          cx={viewBox.cx}
                          cy={viewBox.cy}
                          r={54}
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
          {chartData.map((entry) => (
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
