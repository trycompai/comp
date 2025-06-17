'use client';

import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@comp/ui/card';
import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@comp/ui/chart';
import * as React from 'react';
import { Cell, Label, Pie, PieChart } from 'recharts';
import type { Host } from '../types';

interface DeviceComplianceChartProps {
  devices: Host[];
}

const CHART_COLORS = {
  compliant: 'hsl(var(--chart-positive))',
  nonCompliant: 'hsl(var(--chart-destructive))',
};

export function DeviceComplianceChart({ devices }: DeviceComplianceChartProps) {
  const { pieDisplayData, legendDisplayData } = React.useMemo(() => {
    if (!devices || devices.length === 0) {
      return { pieDisplayData: [], legendDisplayData: [] };
    }
    let compliantCount = 0;
    let nonCompliantCount = 0;

    for (const device of devices) {
      const isCompliant = device.policies.every((policy) => policy.response === 'pass');
      if (isCompliant) {
        compliantCount++;
      } else {
        nonCompliantCount++;
      }
    }
    const allItems = [
      {
        name: 'Compliant',
        value: compliantCount,
        fill: CHART_COLORS.compliant,
      },
      {
        name: 'Non-Compliant',
        value: nonCompliantCount,
        fill: CHART_COLORS.nonCompliant,
      },
    ];
    return {
      pieDisplayData: allItems.filter((item) => item.value > 0),
      legendDisplayData: allItems,
    };
  }, [devices]);

  const totalDevices = React.useMemo(() => {
    return devices?.length || 0;
  }, [devices]);

  const chartConfig = {
    devices: {
      label: 'Devices',
    },
    compliant: {
      label: 'Compliant',
      color: CHART_COLORS.compliant,
    },
    nonCompliant: {
      label: 'Non-Compliant',
      color: CHART_COLORS.nonCompliant,
    },
  } satisfies ChartConfig;

  if (!devices || devices.length === 0) {
    return (
      <Card className="my-6 flex flex-col overflow-hidden border">
        <CardHeader className="pb-2">
          <CardTitle>Device Compliance</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-1 items-center justify-center py-10">
          <div className="space-y-2 text-center">
            <p className="text-muted-foreground text-center text-sm">
              No device data available. Please make sure your employees access the portal and
              install the device agent.
            </p>
          </div>
        </CardContent>
        <CardFooter className="bg-muted/30 border-t py-3">
          <div className="flex w-full flex-wrap justify-center gap-4 py-1" />
        </CardFooter>
      </Card>
    );
  }

  return (
    <Card className="my-6 flex flex-col overflow-hidden border">
      <CardHeader className="items-center pb-0">
        <CardTitle>Device Compliance</CardTitle>
        {/* Optional: Add a subtitle or small description here if needed */}
      </CardHeader>
      <CardContent className="flex-1 pb-0">
        <ChartContainer config={chartConfig} className="mx-auto aspect-square max-h-[300px]">
          <PieChart margin={{ top: 0, right: 20, bottom: 0, left: 20 }}>
            <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel />} />
            <Pie
              data={pieDisplayData}
              dataKey="value"
              nameKey="name"
              innerRadius={60}
              outerRadius={80}
              strokeWidth={2}
              stroke="hsl(var(--background))"
              paddingAngle={2}
              animationDuration={500}
              animationBegin={100}
            >
              {pieDisplayData.map((entry: { name: string; value: number; fill: string }) => (
                <Cell key={entry.name} fill={entry.fill} />
              ))}
              <Label
                content={({ viewBox }) => {
                  if (viewBox && 'cx' in viewBox && 'cy' in viewBox) {
                    return (
                      <text
                        x={viewBox.cx}
                        y={viewBox.cy}
                        textAnchor="middle"
                        dominantBaseline="middle"
                        className="fill-foreground"
                      >
                        <tspan
                          x={viewBox.cx}
                          y={(viewBox.cy || 0) - 10}
                          className="text-3xl font-bold"
                        >
                          {totalDevices.toLocaleString()}
                        </tspan>
                        <tspan
                          x={viewBox.cx}
                          y={(viewBox.cy || 0) + 20}
                          className="text-muted-foreground text-sm"
                        >
                          Devices
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
      </CardContent>
      <CardFooter className="bg-muted/30 border-t p-4 text-sm">
        <div className="flex w-full flex-wrap items-center justify-center gap-x-4 gap-y-2">
          {legendDisplayData.map((item: { name: string; value: number; fill: string }) => (
            <div key={item.name} className="flex items-center gap-1">
              <span className="h-2.5 w-2.5 shrink-0" style={{ backgroundColor: item.fill }} />
              <span className="text-muted-foreground font-medium capitalize">
                {item.name} ({item.value})
              </span>
            </div>
          ))}
        </div>
      </CardFooter>
    </Card>
  );
}
