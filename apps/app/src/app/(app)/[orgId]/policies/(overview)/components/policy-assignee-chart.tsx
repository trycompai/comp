'use client';

import * as React from 'react';

import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@comp/ui/chart';
import { Card, HStack, Stack, Text } from '@trycompai/design-system';
import { UserMultiple } from '@trycompai/design-system/icons';
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis } from 'recharts';

interface AssigneeData {
  id: string;
  name: string;
  total: number;
  published: number;
  draft: number;
  archived: number;
  needs_review: number;
}

interface PolicyAssigneeChartProps {
  data?: AssigneeData[] | null;
}

// Using oklch values from DS globals.css
const CHART_COLORS = {
  published: 'oklch(0.6 0.16 145)', // --success (green)
  draft: 'oklch(0.75 0.15 85)', // --warning (yellow)
  archived: 'oklch(0.556 0 0)', // --muted-foreground (gray)
  needs_review: 'oklch(0.58 0.22 27)', // --destructive (red)
};

export function PolicyAssigneeChart({ data }: PolicyAssigneeChartProps) {
  // Sort assignees by total policies (descending)
  const sortedData = React.useMemo(() => {
    if (!data || data.length === 0) return [];
    return [...data]
      .sort((a, b) => b.total - a.total)
      .slice(0, 4)
      .reverse();
  }, [data]);

  // Calculate total policies and top assignee
  const totalPolicies = React.useMemo(() => {
    if (!data || data.length === 0) return 0;
    return data.reduce((sum, item) => sum + item.total, 0);
  }, [data]);

  const topAssignee = React.useMemo(() => {
    if (!data || data.length === 0) return null;
    return data.reduce((prev, current) => (prev.total > current.total ? prev : current));
  }, [data]);

  if (!data || data.length === 0) {
    return (
      <Card title="Policies by Assignee" width="full">
        <div className="flex h-[175px] flex-col items-center justify-center gap-3">
          <UserMultiple size={40} className="text-muted-foreground opacity-30" />
          <Text size="sm" variant="muted">
            No policies assigned to users
          </Text>
        </div>
      </Card>
    );
  }

  const chartData = sortedData.map((item) => ({
    name: item.name,
    published: item.published,
    draft: item.draft,
    archived: item.archived,
    needs_review: item.needs_review,
  }));

  const chartConfig = {
    published: {
      label: 'Published',
      color: CHART_COLORS.published,
    },
    draft: {
      label: 'Draft',
      color: CHART_COLORS.draft,
    },
    archived: {
      label: 'Archived',
      color: CHART_COLORS.archived,
    },
    needs_review: {
      label: 'Needs Review',
      color: CHART_COLORS.needs_review,
    },
  } satisfies ChartConfig;

  return (
    <Card title="Policies by Assignee" width="full">
      <Stack gap="md">
        <HStack justify="between">
          <Text size="xs" variant="muted">
            Assignee
          </Text>
          <Text size="xs" variant="muted">
            Policy Count
          </Text>
        </HStack>
        <ChartContainer config={chartConfig}>
          <ResponsiveContainer width="100%" height={175}>
            <BarChart
              accessibilityLayer
              data={chartData}
              layout="vertical"
              barSize={17}
              barGap={3}
              margin={{
                top: 0,
                right: 0,
                bottom: 0,
                left: 0,
              }}
            >
              <XAxis type="number" hide />
              <YAxis
                dataKey="name"
                type="category"
                tickLine={false}
                tickMargin={10}
                axisLine={false}
                tickFormatter={(value) => value.split(' ')[0]}
                fontSize={12}
                stroke="hsl(var(--muted-foreground))"
              />
              <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
              <Bar
                dataKey="published"
                stackId="a"
                fill={CHART_COLORS.published}
                radius={[0, 2, 2, 0]}
                animationDuration={800}
                animationBegin={100}
              />
              <Bar
                dataKey="draft"
                stackId="a"
                fill={CHART_COLORS.draft}
                radius={[0, 0, 0, 0]}
                animationDuration={800}
                animationBegin={200}
              />
              <Bar
                dataKey="archived"
                stackId="a"
                fill={CHART_COLORS.archived}
                radius={[0, 0, 0, 0]}
                animationDuration={800}
                animationBegin={300}
              />
              <Bar
                dataKey="needs_review"
                stackId="a"
                fill={CHART_COLORS.needs_review}
                radius={[0, 0, 0, 0]}
                animationDuration={800}
                animationBegin={400}
              />
            </BarChart>
          </ResponsiveContainer>
        </ChartContainer>
        <HStack justify="center" gap="md">
          {Object.entries(chartConfig).map(([key, config]) => (
            <HStack key={key} gap="xs" align="center">
              <div className="h-3 w-3" style={{ backgroundColor: config.color }} />
              <Text size="xs" weight="medium">
                {config.label}
              </Text>
            </HStack>
          ))}
        </HStack>
      </Stack>
    </Card>
  );
}
