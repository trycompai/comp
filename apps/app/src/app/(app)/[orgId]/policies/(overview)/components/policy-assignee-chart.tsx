'use client';

import * as React from 'react';

import { Badge } from '@comp/ui/badge';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@comp/ui/card';
import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@comp/ui/chart';
import { Users } from 'lucide-react';
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

const CHART_COLORS = {
  published: 'hsl(var(--chart-positive))', // green
  draft: 'hsl(var(--chart-neutral))', // yellow
  archived: 'hsl(var(--chart-warning))', // gray
  needs_review: 'hsl(var(--chart-destructive))', // red
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
      <Card className="flex flex-col overflow-hidden border">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">{'Policies by Assignee'}</CardTitle>

            <Badge variant="outline" className="text-xs">
              Distribution
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="flex flex-1 items-center justify-center py-10">
          <div className="space-y-2 text-center">
            <div className="text-muted-foreground flex justify-center">
              <Users className="h-10 w-10 opacity-30" />
            </div>
            <p className="text-muted-foreground text-center text-sm">
              No policies assigned to users
            </p>
          </div>
        </CardContent>
        <CardFooter className="bg-muted/30 border-t py-3">
          <div className="flex w-full flex-wrap justify-center gap-4 py-1" />
        </CardFooter>
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
    <Card className="flex flex-col overflow-hidden border">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">{'Policies by Assignee'}</CardTitle>
        </div>

        <div className="bg-secondary relative mt-2 h-1 w-full overflow-hidden rounded-full">
          <div
            className="bg-primary h-full transition-all"
            style={{
              width: `${totalPolicies > 0 ? 100 : 0}%`,
            }}
          />
        </div>
      </CardHeader>
      <CardContent className="flex-1">
        <div className="flex h-full flex-col">
          <div className="text-muted-foreground mb-1 flex items-center justify-between px-1 text-xs">
            <span>Assignee</span>
            <span>Policy Count</span>
          </div>
          <ChartContainer config={chartConfig}>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart
                accessibilityLayer
                data={chartData}
                layout="vertical"
                barSize={24}
                barGap={4}
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
        </div>
      </CardContent>
      <CardFooter className="bg-muted/30 border-t py-3">
        <div className="flex w-full flex-wrap justify-center gap-4 py-1">
          {Object.entries(chartConfig).map(([key, config]) => (
            <div key={key} className="flex items-center gap-2">
              <div className="h-3 w-3" style={{ backgroundColor: config.color }} />
              <span className="text-xs font-medium">{config.label}</span>
            </div>
          ))}
        </div>
      </CardFooter>
    </Card>
  );
}
