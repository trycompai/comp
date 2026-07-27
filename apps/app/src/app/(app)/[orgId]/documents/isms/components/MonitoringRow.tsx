'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import {
  Badge,
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
  Grid,
  Heading,
  HStack,
  Stack,
  Text,
} from '@trycompai/design-system';
import { ChevronDown } from '@trycompai/design-system/icons';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import type { IsmsMetric } from '../isms-types';
import type { ApproverOption } from './IsmsApprovalSection';
import { MeasurementHistory } from './MeasurementHistory';
import { MetricFields } from './MetricFields';
import { MetricsDueCard, type DueMeasurementRow } from './MetricsDueCard';
import { MonitoringRowActions } from './MonitoringRowActions';
import { metricSchema, toMetricPayload, type MetricFormValues } from './metric-schema';
import {
  computeDueEntries,
  METRIC_CADENCE_LABELS,
  metricIsOverdue,
} from './monitoring-constants';
import type { RecordMeasurementValues } from './RecordMeasurementForm';
import { IsmsRegisterCard, IsmsRegisterField, IsmsSourceBadge } from './shared';

export interface MonitoringRowHandlers {
  onUpdateMetric: (metricId: string, payload: Record<string, unknown>) => Promise<void>;
  onDeleteMetric: (metricId: string) => Promise<void>;
  onRecordMeasurement: (
    metricId: string,
    values: RecordMeasurementValues,
  ) => Promise<void>;
  onBulkSaveMeasurements: (rows: DueMeasurementRow[]) => Promise<void>;
  onDeleteMeasurement: (measurementId: string) => Promise<void>;
}

interface MonitoringRowProps extends MonitoringRowHandlers {
  metric: IsmsMetric;
  canEdit: boolean;
  memberOptions: ApproverOption[];
  memberNames: Record<string, string>;
}

function toFormValues(metric: IsmsMetric): MetricFormValues {
  return {
    name: metric.name,
    whatIsMeasured: metric.whatIsMeasured,
    method: metric.method,
    cadence: metric.cadence ?? '',
    monitorMemberId: metric.monitorMemberId ?? '',
    analyzeMemberId: metric.analyzeMemberId ?? '',
    target: metric.target ?? '',
  };
}

export function MonitoringRow({
  metric,
  canEdit,
  memberOptions,
  memberNames,
  onUpdateMetric,
  onDeleteMetric,
  onRecordMeasurement,
  onBulkSaveMeasurements,
  onDeleteMeasurement,
}: MonitoringRowProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isToggling, setIsToggling] = useState(false);
  const isCustom = metric.metricKey === null;
  const now = new Date();
  const isOverdue = metricIsOverdue(metric, now);
  const backfillEntries = computeDueEntries({ metrics: [metric], now });

  const {
    control,
    handleSubmit,
    reset,
    formState: { isDirty, isValid, isSubmitting },
  } = useForm<MetricFormValues>({
    resolver: zodResolver(metricSchema),
    mode: 'onChange',
    defaultValues: toFormValues(metric),
  });

  useEffect(() => {
    if (!isEditing) reset(toFormValues(metric));
  }, [metric, isEditing, reset]);

  const handleSave = handleSubmit(async (values) => {
    try {
      await onUpdateMetric(metric.id, toMetricPayload(values));
    } catch {
      return;
    }
    setIsEditing(false);
  });

  const handleToggleActive = async () => {
    setIsToggling(true);
    try {
      await onUpdateMetric(metric.id, { isActive: !metric.isActive });
    } catch {
      // Error already surfaced via toast by the caller.
    } finally {
      setIsToggling(false);
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await onDeleteMetric(metric.id);
    } catch {
      // Error already surfaced via toast by the caller.
    } finally {
      setIsDeleting(false);
    }
  };

  const personDisplay = (memberId: string | null): string =>
    memberId
      ? (memberNames[memberId] ?? 'Former member')
      : 'Security & Privacy Owner (default)';

  const latest = metric.measurements[0];

  return (
    <IsmsRegisterCard
      header={
        <Stack gap="2">
          <HStack align="center" gap="2">
            <IsmsSourceBadge source={metric.source} derivedFrom={metric.derivedFrom} />
            {metric.cadence ? (
              <Badge variant="outline">{METRIC_CADENCE_LABELS[metric.cadence]}</Badge>
            ) : null}
            {!metric.isActive ? <Badge variant="outline">Inactive</Badge> : null}
            {isOverdue ? <Badge variant="destructive">Overdue</Badge> : null}
          </HStack>
          <Heading level="4">{metric.name}</Heading>
        </Stack>
      }
      headerEnd={
        canEdit ? (
          <MonitoringRowActions
            metricName={metric.name}
            isCustom={isCustom}
            isActive={metric.isActive}
            isEditing={isEditing}
            isDirty={isDirty}
            isValid={isValid}
            isSubmitting={isSubmitting}
            isDeleting={isDeleting}
            isToggling={isToggling}
            onEdit={() => setIsEditing(true)}
            onCancel={() => {
              reset(toFormValues(metric));
              setIsEditing(false);
            }}
            onSave={handleSave}
            onToggleActive={handleToggleActive}
            onDelete={handleDelete}
          />
        ) : undefined
      }
    >
      {isEditing ? (
        <MetricFields control={control} memberOptions={memberOptions} showName={isCustom} />
      ) : (
        <Stack gap="4">
          <Grid cols={{ base: '1', md: '2' }} gap="3">
            <IsmsRegisterField label="What is measured">
              {metric.whatIsMeasured || '—'}
            </IsmsRegisterField>
            <IsmsRegisterField label="Method">{metric.method || '—'}</IsmsRegisterField>
            <IsmsRegisterField label="Who monitors">
              {personDisplay(metric.monitorMemberId)}
            </IsmsRegisterField>
            <IsmsRegisterField label="Who analyses">
              {personDisplay(metric.analyzeMemberId)}
            </IsmsRegisterField>
            <IsmsRegisterField label="Target">
              {metric.target ||
                (metric.objective
                  ? (metric.objective.target ?? metric.objective.objective)
                  : '—')}
            </IsmsRegisterField>
            <IsmsRegisterField label="Source">
              {metric.dataSource === 'manual' ? 'Manual entry' : metric.dataSource}
            </IsmsRegisterField>
            <IsmsRegisterField label="Latest value">
              {latest ? latest.value : '—'}
            </IsmsRegisterField>
          </Grid>

          <Collapsible>
            <CollapsibleTrigger className="flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground">
              <ChevronDown size={16} />
              Measurement history ({metric.measurements.length})
              {backfillEntries.length > 0
                ? ` · ${backfillEntries.length} missing period${
                    backfillEntries.length === 1 ? '' : 's'
                  }`
                : ''}
            </CollapsibleTrigger>
            <CollapsibleContent>
              <Stack gap="4">
                {canEdit && backfillEntries.length > 0 ? (
                  <Stack gap="2">
                    <Text size="sm" variant="muted">
                      Backfill missing periods — values save with today&apos;s
                      recorded-on date.
                    </Text>
                    <MetricsDueCard
                      key={backfillEntries.map((entry) => entry.periodKey).join('|')}
                      entries={backfillEntries}
                      showMetricName={false}
                      onSaveAll={onBulkSaveMeasurements}
                    />
                  </Stack>
                ) : null}
                <MeasurementHistory
                  metric={metric}
                  canEdit={canEdit}
                  memberNames={memberNames}
                  onRecord={(values) => onRecordMeasurement(metric.id, values)}
                  onDeleteMeasurement={onDeleteMeasurement}
                />
              </Stack>
            </CollapsibleContent>
          </Collapsible>
        </Stack>
      )}
    </IsmsRegisterCard>
  );
}
