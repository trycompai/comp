'use client';

import * as React from 'react';

import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@comp/ui/chart';
import { Card, HStack, Text } from '@trycompai/design-system';
import { UserMultiple } from '@trycompai/design-system/icons';
import { Bar, BarChart, Cell, LabelList, ResponsiveContainer, XAxis, YAxis } from 'recharts';

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

const BAR_COLOR = 'var(--primary)';

const STATUS_COLORS = {
  published: 'var(--success)',
  draft: 'var(--warning)',
  needs_review: 'var(--destructive)',
  archived: 'var(--muted-foreground)',
};

export function PolicyAssigneeChart({ data }: PolicyAssigneeChartProps) {
  // Sort assignees by total policies (descending) and take top 5
  const sortedData = React.useMemo(() => {
    if (!data || data.length === 0) return [];
    return [...data].sort((a, b) => b.total - a.total).slice(0, 5);
  }, [data]);

  // Calculate totals for footer
  const totalAssignees = data?.length ?? 0;
  const totalAssignedPolicies = data?.reduce((sum, a) => sum + a.total, 0) ?? 0;

  if (!data || data.length === 0) {
    return (
      <Card title="Policies by Assignee" width="full" size="sm" spacing="tight">
        <div className="flex h-[140px] flex-col items-center justify-center gap-2">
          <UserMultiple size={20} className="text-muted-foreground opacity-30" />
          <Text size="xs" variant="muted">
            No policies assigned to users
          </Text>
        </div>
      </Card>
    );
  }

  const chartData = sortedData.map((item) => ({
    name: item.name.split(' ')[0], // First name only for cleaner display
    fullName: item.name,
    total: item.total,
  }));

  const chartConfig = {
    total: {
      label: 'Policies',
      color: BAR_COLOR,
    },
  } satisfies ChartConfig;

  // Dynamic height based on number of assignees
  const barHeight = 28;
  const chartHeight = Math.max(sortedData.length * barHeight, 80);

  const showingLimited = totalAssignees > 5;

  return (
    <Card title="Policies by Assignee" width="full" size="sm" spacing="tight">
      <div className="flex h-[120px] items-center px-2">
        <ChartContainer config={chartConfig} className="w-full">
          <ResponsiveContainer width="100%" height={chartHeight}>
            <BarChart
              data={chartData}
              layout="vertical"
              barSize={18}
              margin={{ top: 0, right: 40, bottom: 0, left: 0 }}
            >
              <XAxis type="number" hide />
              <YAxis
                dataKey="name"
                type="category"
                tickLine={false}
                tickMargin={8}
                axisLine={false}
                fontSize={12}
                stroke="hsl(var(--muted-foreground))"
                width={60}
              />
              <ChartTooltip
                cursor={false}
                content={
                  <ChartTooltipContent
                    formatter={(value, name, props) => (
                      <span>
                        {props.payload.fullName}: {value} policies
                      </span>
                    )}
                  />
                }
              />
              <Bar dataKey="total" radius={[0, 4, 4, 0]} animationDuration={600}>
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={BAR_COLOR} />
                ))}
                <LabelList
                  dataKey="total"
                  position="right"
                  fontSize={11}
                  fill="hsl(var(--muted-foreground))"
                  offset={8}
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartContainer>
      </div>
      <div className="border-t border-border pt-3 mt-3">
        <HStack justify="between" align="center">
          <HStack gap="md" align="center">
            {Object.entries(STATUS_COLORS).map(([status, color]) => (
              <HStack key={status} gap="xs" align="center">
                <div className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: color }} />
                <Text size="xs" variant="muted">
                  {status === 'needs_review'
                    ? 'Review'
                    : status.charAt(0).toUpperCase() + status.slice(1)}
                </Text>
              </HStack>
            ))}
          </HStack>
          <Text size="xs" variant="muted">
            {showingLimited ? `Top 5 of ${totalAssignees}` : `${totalAssignees} assignees`}
          </Text>
        </HStack>
      </div>
    </Card>
  );
}
