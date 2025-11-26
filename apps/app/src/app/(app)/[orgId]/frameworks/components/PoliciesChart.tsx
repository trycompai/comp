'use client';

import * as React from 'react';
import { Label, Pie, PieChart } from 'recharts';

import { Card, CardContent, CardHeader, CardTitle } from '@comp/ui/card';
import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@comp/ui/chart';
import { Info } from 'lucide-react';

interface PoliciesChartData {
  published: number;
  draft: number;
}

interface PoliciesChartProps {
  data?: PoliciesChartData | null;
}

const CHART_COLORS = {
  score: 'hsl(var(--chart-primary))',
  remaining: 'hsl(var(--muted))',
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

export function PoliciesChart({ data }: PoliciesChartProps) {
  const chartData = React.useMemo(() => {
    if (!data) return [];
    const items = [
      {
        name: 'Published',
        value: data.published,
        fill: CHART_COLORS.score,
      },
      {
        name: 'Draft',
        value: data.draft,
        fill: CHART_COLORS.remaining,
      },
    ];
    return items.filter((item) => item.value > 0);
  }, [data]);

  if (!data) {
    return (
      <Card className="flex flex-col overflow-hidden border">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">Policies</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="flex flex-1 items-center justify-center py-10">
          <div className="space-y-2 text-center">
            <div className="text-muted-foreground flex justify-center">
              <Info className="h-10 w-10 opacity-30" />
            </div>
            <p className="text-muted-foreground text-center text-sm">No data available</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const chartConfig = {
    value: {
      label: 'Policy Status',
    },
  } satisfies ChartConfig;

  return (
    <ChartContainer config={chartConfig} className="mx-auto h-[120px] max-w-[150px]">
      <PieChart
        width={120}
        height={120}
        margin={{
          top: 0,
          right: 0,
          bottom: 0,
          left: 0,
        }}
      >
        <ChartTooltip cursor={false} content={<ChartTooltipContent isPercentage={true} />} />
        <Pie
          data={chartData}
          dataKey="value"
          nameKey="name"
          innerRadius={35}
          outerRadius={50}
          paddingAngle={2}
          strokeWidth={2}
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
                        className="fill-foreground text-base font-medium select-none"
                      >
                        {data.published}%
                      </tspan>
                      <tspan
                        x={viewBox.cx}
                        y={(viewBox.cy || 0) + 18}
                        className="fill-muted-foreground text-[9px] select-none"
                      >
                        Policies
                      </tspan>
                    </text>
                    <circle
                      cx={viewBox.cx}
                      cy={viewBox.cy}
                      r={32}
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
  );
}
