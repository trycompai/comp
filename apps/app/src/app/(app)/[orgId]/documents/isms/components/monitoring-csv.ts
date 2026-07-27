import type { IsmsMetric } from '../isms-types';
import { periodLabel, toPeriodKey } from './monitoring-periods';

/**
 * CSV export of a metric's measurement history for auditor sampling (CS-723).
 * Follows the devices-csv pattern: CSV-injection guard, RFC-4180 quoting,
 * CRLF line ends, and a UTF-8 BOM so Excel opens it correctly.
 */

function escapeCell(raw: string): string {
  let cell = raw;
  // Guard against CSV/formula injection when opened in a spreadsheet.
  if (/^[=+\-@\t\r]/.test(cell)) cell = `'${cell}`;
  if (/[",\r\n]/.test(cell)) cell = `"${cell.replace(/"/g, '""')}"`;
  return cell;
}

function formatDate(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toISOString().slice(0, 10);
}

/** Build the history CSV: one row per measurement, newest first. */
export function buildMeasurementsCsv({
  metric,
  memberNames,
}: {
  metric: IsmsMetric;
  memberNames: Record<string, string>;
}): string {
  const header = [
    'Metric',
    'Period covered',
    'Period start',
    'Value',
    'Recorded on',
    'Entered by',
    'Source',
    'Note',
  ].join(',');

  const rows = metric.measurements.map((measurement) => {
    const key = toPeriodKey(measurement.periodStart);
    const period =
      key && metric.cadence ? periodLabel(metric.cadence, key) : (key ?? '');
    return [
      metric.name,
      period,
      key ?? '',
      measurement.value,
      formatDate(measurement.recordedAt),
      measurement.enteredById
        ? (memberNames[measurement.enteredById] ?? measurement.enteredById)
        : '',
      measurement.source,
      measurement.note ?? '',
    ]
      .map(escapeCell)
      .join(',');
  });

  return `\uFEFF${[header, ...rows].join('\r\n')}\r\n`;
}

/** Sanitized, date-stamped filename for a metric's history export. */
export function measurementsCsvFilename(metric: IsmsMetric, now: Date): string {
  const slug =
    metric.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'metric';
  return `${slug}-measurements-${now.toISOString().slice(0, 10)}.csv`;
}

/** Trigger a browser download of the CSV contents. */
export function downloadCsv(filename: string, contents: string): void {
  const blob = new Blob([contents], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  setTimeout(() => URL.revokeObjectURL(url), 0);
}
