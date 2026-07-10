'use client';

import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@trycompai/ui/card';
import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@trycompai/ui/chart';
import * as React from 'react';
import { Cell, Label, Pie, PieChart } from 'recharts';
import type { DeviceWithChecks, Host } from '../types';
import { computeSourceComplianceVerdict } from '../lib/device-source';

interface DeviceComplianceChartProps {
  fleetDevices: Host[];
  agentDevices: DeviceWithChecks[];
}

// Design-system tokens (full oklch values — no hsl() wrapper). The previous
// `hsl(var(--chart-positive))` tokens came from the legacy @trycompai/ui
// stylesheet the app no longer loads, so every segment silently rendered as
// SVG-default black.
const CHART_COLORS = {
  compliant: 'var(--primary)', // brand green
  nonCompliant: 'var(--destructive)', // red
  unverified: 'var(--muted-foreground)', // gray — canonical checks not (fully) reported
};

export function DeviceComplianceChart({ fleetDevices, agentDevices }: DeviceComplianceChartProps) {
  // ALL devices count — the chart total must match the table so the page never
  // looks self-contradictory. Imported devices are judged by CompAI's OWN
  // standard (the four canonical checks, computed from source-reported data);
  // partially/un-reported devices land in a gray "Unverified" segment rather
  // than being fabricated into a verdict.
  const devices = [...(agentDevices ?? []), ...(fleetDevices ?? [])];

  const { pieDisplayData, legendDisplayData } = React.useMemo(() => {
    if (devices.length === 0) {
      return { pieDisplayData: [], legendDisplayData: [] };
    }
    let compliantCount = 0;
    let nonCompliantCount = 0;
    let unverifiedCount = 0;

    for (const device of agentDevices ?? []) {
      if (device.source === 'integration') {
        // CompAI's verdict computed from the canonical source-reported checks
        // (vendor's own verdict is informational-only and never counted).
        const verdict = computeSourceComplianceVerdict(device);
        if (verdict?.kind === 'compliant') compliantCount++;
        else if (verdict?.kind === 'non_compliant') nonCompliantCount++;
        // Both partial ('unverified') and zero-data ('not_tracked') devices
        // land in the gray segment: neither has a defensible verdict.
        else unverifiedCount++;
        continue;
      }
      // Device-agent devices. Stale devices (no check-in for >= 7 days)
      // count as non-compliant to match the table's three-state rendering.
      if (device.complianceStatus === 'compliant') {
        compliantCount++;
      } else {
        nonCompliantCount++;
      }
    }

    // Count fleet devices
    for (const device of fleetDevices ?? []) {
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
      {
        name: 'Unverified',
        value: unverifiedCount,
        fill: CHART_COLORS.unverified,
      },
    ];
    return {
      pieDisplayData: allItems.filter((item) => item.value > 0),
      // "Unverified" only appears in the legend when it exists — orgs with no
      // partially-verified imported devices keep the familiar two-entry legend.
      legendDisplayData: allItems.filter(
        (item) => item.name !== 'Unverified' || item.value > 0,
      ),
    };
  }, [agentDevices, fleetDevices]);

  const totalDevices = devices.length;

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
