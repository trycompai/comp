import { z } from 'zod';
import { METRIC_CADENCES } from './monitoring-constants';

/**
 * Canonical zod schema for a monitoring metric (clause 9.1). Shared by the
 * add form (MonitoringForm) and the inline edit row (MonitoringRow) so both
 * validate identically. Cadence may be left empty while drafting — the
 * clause-9.1 submit gate requires it on active metrics.
 */
export const metricSchema = z.object({
  name: z.string().trim().min(1, 'Name is required'),
  whatIsMeasured: z.string(),
  method: z.string(),
  cadence: z.union([z.enum(METRIC_CADENCES), z.literal('')]),
  monitorMemberId: z.string(),
  analyzeMemberId: z.string(),
  target: z.string(),
});

export type MetricFormValues = z.infer<typeof metricSchema>;

/** Map form values to the register API payload (empty string → null). */
export function toMetricPayload(values: MetricFormValues) {
  return {
    name: values.name,
    whatIsMeasured: values.whatIsMeasured,
    method: values.method,
    cadence: values.cadence === '' ? null : values.cadence,
    monitorMemberId: values.monitorMemberId || null,
    analyzeMemberId: values.analyzeMemberId || null,
    target: values.target || null,
  };
}
