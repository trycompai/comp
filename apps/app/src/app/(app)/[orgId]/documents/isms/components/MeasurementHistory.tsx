'use client';

import {
  Button,
  HStack,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Text,
} from '@trycompai/design-system';
import { Download, TrashCan } from '@trycompai/design-system/icons';
import { useState } from 'react';
import type { IsmsMeasurement, IsmsMetric } from '../isms-types';
import {
  buildMeasurementsCsv,
  downloadCsv,
  measurementsCsvFilename,
} from './monitoring-csv';
import { addPeriods, periodLabel, toPeriodKey } from './monitoring-periods';
import { RecordMeasurementForm, type RecordMeasurementValues } from './RecordMeasurementForm';

interface MeasurementHistoryProps {
  metric: IsmsMetric;
  canEdit: boolean;
  /** memberId → display name, for the "Entered by" column. */
  memberNames: Record<string, string>;
  onRecord: (values: RecordMeasurementValues) => Promise<void>;
  onDeleteMeasurement: (measurementId: string) => Promise<void>;
}

type HistoryRow =
  | { kind: 'measurement'; measurement: IsmsMeasurement; periodText: string }
  | { kind: 'gap'; key: string; periodText: string };

/**
 * Interleave gap markers between measured periods so historical gaps stay
 * visible in the history even after the overdue state clears (per CS-723).
 * Measurements arrive newest first; gaps are only marked BETWEEN measured
 * periods (periods ahead/behind the record range belong to the due view).
 */
function buildHistoryRows(metric: IsmsMetric): HistoryRow[] {
  const rows: HistoryRow[] = [];
  const cadence = metric.cadence;
  let previousKey: string | null = null;

  for (const measurement of metric.measurements) {
    const key = toPeriodKey(measurement.periodStart);
    if (key && cadence && previousKey) {
      // Walk down from the period below the previous row to this row's period.
      for (
        let gap = addPeriods(cadence, previousKey, -1);
        gap > key;
        gap = addPeriods(cadence, gap, -1)
      ) {
        rows.push({
          kind: 'gap',
          key: `gap:${gap}`,
          periodText: periodLabel(cadence, gap),
        });
      }
    }
    rows.push({
      kind: 'measurement',
      measurement,
      periodText:
        key && cadence ? periodLabel(cadence, key) : (key ?? measurement.periodStart),
    });
    if (key && key !== previousKey) previousKey = key;
  }
  return rows;
}

function formatDate(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toISOString().slice(0, 10);
}

export function MeasurementHistory({
  metric,
  canEdit,
  memberNames,
  onRecord,
  onDeleteMeasurement,
}: MeasurementHistoryProps) {
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const rows = buildHistoryRows(metric);

  const handleDelete = async (measurementId: string) => {
    setDeletingId(measurementId);
    try {
      await onDeleteMeasurement(measurementId);
    } catch {
      // Error already toasted by the caller.
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <Stack gap="3">
      <HStack justify="between" align="center">
        <Text size="sm" variant="muted">
          Every measurement is a timestamped record — the recorded-on date is
          set by the platform and cannot be edited.
        </Text>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          iconLeft={<Download size={16} />}
          disabled={metric.measurements.length === 0}
          onClick={() =>
            downloadCsv(
              measurementsCsvFilename(metric, new Date()),
              buildMeasurementsCsv({ metric, memberNames }),
            )
          }
        >
          Export CSV
        </Button>
      </HStack>

      {canEdit && metric.isActive && metric.cadence ? (
        <RecordMeasurementForm metric={metric} onRecord={onRecord} />
      ) : null}

      {rows.length === 0 ? (
        <Text size="sm" variant="muted">
          No measurements recorded yet.
        </Text>
      ) : (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Period</TableHead>
                <TableHead>Value</TableHead>
                <TableHead>Recorded on</TableHead>
                <TableHead>Entered by</TableHead>
                <TableHead>Note</TableHead>
                {canEdit ? <TableHead aria-label="Actions" /> : null}
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) =>
                row.kind === 'gap' ? (
                  <TableRow key={row.key}>
                    <TableCell>{row.periodText}</TableCell>
                    <TableCell colSpan={canEdit ? 5 : 4}>
                      <Text size="sm" variant="muted">
                        No measurement recorded for this period
                      </Text>
                    </TableCell>
                  </TableRow>
                ) : (
                  <TableRow key={row.measurement.id}>
                    <TableCell>{row.periodText}</TableCell>
                    <TableCell>{row.measurement.value}</TableCell>
                    <TableCell>{formatDate(row.measurement.recordedAt)}</TableCell>
                    <TableCell>
                      {row.measurement.enteredById
                        ? (memberNames[row.measurement.enteredById] ?? 'Former member')
                        : '—'}
                    </TableCell>
                    <TableCell>{row.measurement.note ?? '—'}</TableCell>
                    {canEdit ? (
                      <TableCell>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          aria-label={`Delete measurement for ${row.periodText}`}
                          iconLeft={<TrashCan size={16} />}
                          loading={deletingId === row.measurement.id}
                          disabled={deletingId !== null}
                          onClick={() => handleDelete(row.measurement.id)}
                        />
                      </TableCell>
                    ) : null}
                  </TableRow>
                ),
              )}
            </TableBody>
          </Table>
        </div>
      )}
    </Stack>
  );
}
