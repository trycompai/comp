'use client';

import * as React from 'react';
import { Label, Pie, PieChart } from 'recharts';

import { Badge } from '@comp/ui/badge';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@comp/ui/card';
import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@comp/ui/chart';
import { Info } from 'lucide-react';

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

const CHART_COLORS = {
  published: 'hsl(var(--chart-positive))', // green
  draft: 'hsl(var(--chart-neutral))', // yellow
  archived: 'hsl(var(--chart-warning))', // gray
  needs_review: 'hsl(var(--chart-destructive))', // red
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
      <Card className="flex flex-col overflow-hidden border">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">{'Policy by Status'}</CardTitle>
            <Badge variant="outline" className="text-xs">
              Overview
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="flex flex-1 items-center justify-center py-10">
          <div className="space-y-2 text-center">
            <div className="text-muted-foreground flex justify-center">
              <Info className="h-10 w-10 opacity-30" />
            </div>
            <p className="text-muted-foreground text-center text-sm">No policy data available</p>
          </div>
        </CardContent>
        <CardFooter className="bg-muted/30 border-t py-3">
          <div className="flex w-full flex-wrap justify-center gap-4 py-1" />
        </CardFooter>
      </Card>
    );
  }

  const chartConfig = {
    value: {
      label: 'Count',
    },
  } satisfies ChartConfig;

  return (
    <Card className="flex flex-col overflow-hidden border">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">{'Policy by Status'}</CardTitle>
        </div>

        <div className="bg-secondary relative mt-2 h-1 w-full overflow-hidden rounded-full">
          <div
            className="bg-primary h-full transition-all"
            style={{
              width: `${(data.publishedPolicies / Math.max(data.totalPolicies, 1)) * 100}%`,
            }}
          />
        </div>
      </CardHeader>
      <CardContent className="flex flex-1 items-center justify-center">
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
      </CardContent>
      <CardFooter className="bg-muted/30 border-t py-3">
        <div className="flex w-full flex-wrap justify-center gap-4 py-1">
          {chartData.map((entry) => (
            <div key={entry.name} className="flex items-center gap-2">
              <div className="h-3 w-3" style={{ backgroundColor: entry.fill }} />
              <span className="text-xs font-medium whitespace-nowrap">
                {entry.name}
                <span className="text-muted-foreground ml-1">({entry.value})</span>
              </span>
            </div>
          ))}
        </div>
      </CardFooter>
    </Card>
  );
}
