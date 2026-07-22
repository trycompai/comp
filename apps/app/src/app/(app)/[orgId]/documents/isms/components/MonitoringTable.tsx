'use client';

import { Alert, Heading, Stack, Text } from '@trycompai/design-system';
import { Analytics, WarningAlt } from '@trycompai/design-system/icons';
import type { IsmsMetric } from '../isms-types';
import type { ApproverOption } from './IsmsApprovalSection';
import { MetricsDueCard, type DueMeasurementRow } from './MetricsDueCard';
import type { MetricFormValues } from './metric-schema';
import { computeDueEntries } from './monitoring-constants';
import { MonitoringForm } from './MonitoringForm';
import { MonitoringRow, type MonitoringRowHandlers } from './MonitoringRow';
import { IsmsRegisterCard, IsmsRegisterShell } from './shared';

interface MonitoringTableProps extends MonitoringRowHandlers {
  metrics: IsmsMetric[];
  canEdit: boolean;
  memberOptions: ApproverOption[];
  validationMessages: string[];
  onCreateMetric: (values: MetricFormValues) => Promise<void>;
  onBulkSaveMeasurements: (rows: DueMeasurementRow[]) => Promise<void>;
}

export function MonitoringTable({
  metrics,
  canEdit,
  memberOptions,
  validationMessages,
  onCreateMetric,
  onBulkSaveMeasurements,
  ...rowHandlers
}: MonitoringTableProps) {
  const rows = Array.isArray(metrics) ? metrics : [];
  const memberNames = Object.fromEntries(
    memberOptions.map((member) => [member.id, member.name]),
  );
  const now = new Date();
  // Every metric currently due or overdue, across all metrics — the ticket's
  // "Metrics due" bulk-entry view, which doubles as cross-metric backfill.
  const dueEntries = computeDueEntries({ metrics: rows, now });
  const overdueCount = dueEntries.filter((entry) => !entry.isCurrentPeriod).length;

  return (
    <Stack gap="4">
      {validationMessages.length > 0 ? (
        <Alert variant="warning" icon={<WarningAlt />}>
          <Text size="sm">
            Before the Clause 9.1 document can be submitted:{' '}
            {validationMessages.join(' ')}
          </Text>
        </Alert>
      ) : null}

      {canEdit && dueEntries.length > 0 ? (
        <IsmsRegisterCard
          header={
            <Stack gap="1">
              <Heading level="4">Metrics due</Heading>
              <Text size="sm" variant="muted">
                Fill in the values and save once — one entry per metric per
                period.
                {overdueCount > 0
                  ? ` ${overdueCount} overdue period${overdueCount === 1 ? '' : 's'} can be backfilled here; backfilled values keep today's recorded-on date.`
                  : ''}
              </Text>
            </Stack>
          }
        >
          <MetricsDueCard
            key={dueEntries
              .map((entry) => `${entry.metric.id}:${entry.periodKey}`)
              .join('|')}
            entries={dueEntries}
            showMetricName
            onSaveAll={onBulkSaveMeasurements}
          />
        </IsmsRegisterCard>
      ) : null}

      <IsmsRegisterShell
        title="Metrics"
        count={rows.length}
        emptyIcon={Analytics}
        emptyTitle="No metrics yet"
        emptyDescription="Define what is measured, how, at what cadence, and who monitors and analyses the results."
        footer={
          canEdit ? (
            <MonitoringForm memberOptions={memberOptions} onAdd={onCreateMetric} />
          ) : undefined
        }
      >
        <Stack gap="3">
          {rows.map((metric) => (
            <MonitoringRow
              key={metric.id}
              metric={metric}
              canEdit={canEdit}
              memberOptions={memberOptions}
              memberNames={memberNames}
              onBulkSaveMeasurements={onBulkSaveMeasurements}
              {...rowHandlers}
            />
          ))}
        </Stack>
      </IsmsRegisterShell>
    </Stack>
  );
}
