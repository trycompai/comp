"use client";

import { usePolicies } from "@/app/[locale]/(app)/(dashboard)/policies/hooks/usePolicies";
import { useI18n } from "@/locales/client";
import { Card, CardContent, CardHeader, CardTitle } from "@bubba/ui/card";
import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@bubba/ui/chart";
import { Bar, BarChart, Cell, LabelList, XAxis, YAxis } from "recharts";

export function PoliciesByFramework() {
  const t = useI18n();
  const { data } = usePolicies();

  const config = {
    "SOC 2": { label: "SOC 2" },
    "ISO 27001": { label: "ISO 27001" },
    GDPR: { label: "GDPR" },
    default: { label: "Other" },
  } satisfies ChartConfig;

  if (!data?.length) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t("policies.dashboard.policies_by_framework")}</CardTitle>
        </CardHeader>
        <CardContent className="flex h-[300px] items-center justify-center text-muted-foreground">
          No frameworks have linked policies
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("policies.dashboard.policies_by_framework")}</CardTitle>
      </CardHeader>
      <CardContent>
        <ChartContainer config={config}>
          <BarChart
            data={data}
            layout="vertical"
            margin={{
              left: 0,
              right: 16,
            }}
          >
            <YAxis
              dataKey="name"
              type="category"
              tickLine={false}
              tickMargin={10}
              axisLine={false}
              tickFormatter={(value) =>
                config[value as keyof typeof config]?.label || value
              }
            />
            <XAxis dataKey="value" type="number" hide />
            <ChartTooltip
              cursor={false}
              content={<ChartTooltipContent indicator="line" />}
            />
            <Bar dataKey="value" fill="hsl(var(--chart-1))" maxBarSize={30}>
              <LabelList
                dataKey="value"
                position="right"
                offset={8}
                className="fill-foreground"
                fontSize={12}
              />
              {data.map((entry) => (
                <Cell key={entry.policyId} radius={8} />
              ))}
            </Bar>
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
