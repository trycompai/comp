'use client';

import { PieChart } from '@/components/ui/pie-chart';
import { Card, CardContent, CardHeader, CardTitle } from '@comp/ui/card';
import { cn } from '@comp/ui/cn';

interface Props {
  totalTests: number;
  infoSeverityTests: number;
  lowSeverityTests: number;
  mediumSeverityTests: number;
  highSeverityTests: number;
  criticalSeverityTests: number;
}

export function TestsSeverity({
  totalTests,
  infoSeverityTests,
  lowSeverityTests,
  mediumSeverityTests,
  highSeverityTests,
  criticalSeverityTests,
}: Props) {
  const severityCounts = {
    low: lowSeverityTests,
    medium: mediumSeverityTests,
    high: highSeverityTests,
    critical: criticalSeverityTests,
  };

  const data = [
    {
      name: 'Info',
      value: infoSeverityTests,
      color: 'var(--chart-closed)',
      colorClass: 'bg-[var(--chart-closed)]',
    },
    {
      name: 'Low',
      value: severityCounts.low,
      color: 'var(--chart-archived)',
      colorClass: 'bg-[var(--chart-archived)]',
    },
    {
      name: 'Medium',
      value: severityCounts.medium,
      color: 'var(--chart-pending)',
      colorClass: 'bg-[var(--chart-pending)]',
    },
    {
      name: 'High',
      value: severityCounts.high,
      color: 'var(--chart-open)',
      colorClass: 'bg-[var(--chart-open)]',
    },
    {
      name: 'Critical',
      value: severityCounts.critical,
      color: 'hsl(var(--destructive))',
      colorClass: 'bg-[hsl(var(--destructive))]',
    },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>{'Test Severity Distribution'}</CardTitle>
      </CardHeader>
      <CardContent>
        <PieChart data={data} />
        <div className="mt-4 gap-2 text-sm">
          {data.map((item) => (
            <div key={item.name} className="flex items-center gap-2">
              <div className={cn('h-3 w-3', item.colorClass)} />
              <span>{item.name}</span>
              <span className="ml-auto font-medium">{item.value}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
