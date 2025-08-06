'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@comp/ui/card';
import { type ChartConfig, ChartContainer, ChartTooltip } from '@comp/ui/chart';
import { T, useGT } from 'gt-next';
import { Legend, Line, LineChart, XAxis, YAxis } from 'recharts';

interface AssessmentChartProps {
  data: Array<{
    name: string;
    value: number;
  }>;
}

const getRiskData = (t: (content: string) => string) => [
  { month: t('Jan'), inherentRisk: 15, residualRisk: 9 },
  { month: t('Feb'), inherentRisk: 14, residualRisk: 8 },
  { month: t('Mar'), inherentRisk: 16, residualRisk: 7 },
  { month: t('Apr'), inherentRisk: 15, residualRisk: 6 },
  { month: t('May'), inherentRisk: 14, residualRisk: 5 },
  { month: t('Jun'), inherentRisk: 13, residualRisk: 4 },
];

export function AssessmentChart() {
  const t = useGT();
  const riskData = getRiskData(t);
  const config = {} satisfies ChartConfig;

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <T>Risk Assessment</T>
        </CardTitle>
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
