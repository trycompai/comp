import { Grid, Heading, Stack, Text } from '@trycompai/design-system';
import type { ComponentType } from 'react';

type StatTone = 'default' | 'success' | 'warning';

export interface IsmsSummaryStat {
  label: string;
  value: number;
  icon: ComponentType<{ size?: number }>;
  /** Tints the icon + label. "warning" flags outstanding work, "success" approved. */
  tone?: StatTone;
}

const ICON_TONE: Record<StatTone, string> = {
  default: 'text-muted-foreground',
  success: 'text-success',
  warning: 'text-warning',
};

const LABEL_TONE: Record<StatTone, 'muted' | 'success' | 'warning'> = {
  default: 'muted',
  success: 'success',
  warning: 'warning',
};

function StatTile({ label, value, icon: Icon, tone = 'default' }: IsmsSummaryStat) {
  return (
    <div className="flex items-center gap-3 rounded-md border border-border bg-card p-4">
      <div
        className={`flex size-9 shrink-0 items-center justify-center rounded-md bg-muted ${ICON_TONE[tone]}`}
      >
        <Icon size={18} />
      </div>
      <Stack gap="0">
        <Heading level="2">{String(value)}</Heading>
        <Text size="xs" variant={LABEL_TONE[tone]}>
          {label}
        </Text>
      </Stack>
    </div>
  );
}

/**
 * Compact at-a-glance summary of the ISMS pack state — total / approved /
 * outstanding / needs-review counts. Built from semantic-token stat tiles in a
 * responsive DS Grid.
 */
export function IsmsSummaryRow({ stats }: { stats: IsmsSummaryStat[] }) {
  return (
    <Grid cols={{ base: '2', md: '4' }} gap="3">
      {stats.map((stat) => (
        <StatTile key={stat.label} {...stat} />
      ))}
    </Grid>
  );
}
