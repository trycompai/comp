'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@comp/ui/card';
import { type ChartConfig, ChartContainer, ChartTooltip } from '@comp/ui/chart';
import { Legend, Line, LineChart, XAxis, YAxis } from 'recharts';

interface AssessmentChartProps {
  data: Array<{
    name: string;
    value: number;
  }>;
}

const riskData = [
  { month: 'Jan', inherentRisk: 15, residualRisk: 9 },
  { month: 'Feb', inherentRisk: 14, residualRisk: 8 },
  { month: 'Mar', inherentRisk: 16, residualRisk: 7 },
  { month: 'Apr', inherentRisk: 15, residualRisk: 6 },
  { month: 'May', inherentRisk: 14, residualRisk: 5 },
  { month: 'Jun', inherentRisk: 13, residualRisk: 4 },
];

export function AssessmentChart() {
  const config = {} satisfies ChartConfig;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Risk Assessment</CardTitle>
      </CardHeader>
      <CardContent>
        <ChartContainer config={config}>
          <LineChart data={riskData}>
            <XAxis dataKey="month" />
            <YAxis />
            <Legend />
            <Line
              type="monotone"
              dataKey="inherentRisk"
              stroke="hsl(var(--destructive))"
              strokeWidth={2}
            />
            <Line
              type="monotone"
              dataKey="residualRisk"
              stroke="hsl(var(--primary))"
              strokeWidth={2}
            />
            <ChartTooltip />
          </LineChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
