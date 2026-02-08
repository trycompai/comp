'use client';

import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@comp/ui/chart';
import { Card, HStack, Stack, Text } from '@trycompai/design-system';
import { Information } from '@trycompai/design-system/icons';
import * as React from 'react';
import { Label, Pie, PieChart } from 'recharts';
import type { DeviceWithChecks } from '../types';

interface DeviceComplianceChartProps {
  devices: DeviceWithChecks[];
}

const CHART_COLORS = {
  compliant: 'var(--primary)',
  nonCompliant: 'var(--destructive)',
};

export function DeviceComplianceChart({ devices }: DeviceComplianceChartProps) {
  const allStatuses = React.useMemo(() => {
    if (!devices || devices.length === 0) return [];

    let compliantCount = 0;
    let nonCompliantCount = 0;

    for (const device of devices) {
      if (device.isCompliant) {
        compliantCount++;
      } else {
        nonCompliantCount++;
      }
    }

    return [
      {
        key: 'compliant',
        name: 'Compliant',
        value: compliantCount,
        fill: CHART_COLORS.compliant,
      },
      {
        key: 'nonCompliant',
        name: 'Non-Compliant',
        value: nonCompliantCount,
        fill: CHART_COLORS.nonCompliant,
      },
    ];
  }, [devices]);

  const chartData = React.useMemo(() => {
    return allStatuses.filter((item) => item.value > 0);
  }, [allStatuses]);

  const totalDevices = devices?.length || 0;

  const chartConfig = {
    value: {
      label: 'Count',
    },
  } satisfies ChartConfig;

  if (!devices || devices.length === 0) {
    return (
      <Card title="Device Compliance" width="full" size="sm" spacing="tight">
        <div className="flex h-[120px] flex-col items-center justify-center gap-2">
          <Information size={20} className="text-muted-foreground opacity-30" />
          <Text size="xs" variant="muted">
            No device data available
          </Text>
        </div>
      </Card>
    );
  }

  return (
    <Card title="Device Compliance" width="full" size="sm" spacing="tight">
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
                            {totalDevices}
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
            {totalDevices} total
          </Text>
        </HStack>
      </div>
    </Card>
  );
}
