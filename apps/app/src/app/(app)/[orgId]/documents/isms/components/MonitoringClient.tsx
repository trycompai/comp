'use client';

import { toast } from 'sonner';
import type { IsmsDocument as IsmsDocumentData } from '../isms-types';
import type { ApproverOption } from './IsmsApprovalSection';
import { IsmsDocumentShell } from './IsmsDocumentShell';
import { MonitoringTable } from './MonitoringTable';
import { toMetricPayload } from './metric-schema';
import { metricValidationMessages } from './monitoring-constants';

interface MonitoringClientProps {
  organizationId: string;
  documentId: string;
  fallbackData: IsmsDocumentData | null;
  currentMemberId: string | null;
  approverOptions: ApproverOption[];
  memberOptions: ApproverOption[];
}

const METRICS = 'metrics' as const;
const MEASUREMENTS = 'measurements' as const;

async function run(action: Promise<void>, successMessage: string, failMessage: string) {
  try {
    await action;
    toast.success(successMessage);
  } catch (caught) {
    toast.error(caught instanceof Error ? caught.message : failMessage);
    // Re-throw so the calling form/row keeps its state on failure.
    throw caught;
  }
}

export function MonitoringClient({ memberOptions, ...props }: MonitoringClientProps) {
  return (
    <IsmsDocumentShell
      {...props}
      clause="9.1"
      title="Monitoring, Measurement, Analysis and Evaluation"
      description="Define what the organization measures, how, at what cadence, and who monitors and analyses the results (ISO 27001 clause 9.1). Record measurement values each period; history stays with each metric for auditor sampling."
      sectionTitle="Monitoring metrics"
      sectionDescription="Nine defaults ship active — edit, deactivate, or add custom metrics. Values are entered manually in v1."
      generateSuccessMessage="Restored any missing seeded metrics"
      getSubmitBlockedReason={(document) => {
        const messages = metricValidationMessages({
          metrics: Array.isArray(document.metrics) ? document.metrics : [],
        });
        return messages.length > 0
          ? `Complete the metrics register before submitting: ${messages.join(' ')}`
          : null;
      }}
    >
      {({ document, canManage, hook }) => {
        const metrics = Array.isArray(document.metrics) ? document.metrics : [];
        const validationMessages = metricValidationMessages({ metrics });

        return (
          <MonitoringTable
            metrics={metrics}
            canEdit={canManage}
            memberOptions={memberOptions}
            validationMessages={validationMessages}
            onCreateMetric={(values) =>
              run(
                hook.createRow({ register: METRICS, data: toMetricPayload(values) }),
                'Metric added',
                'Failed to add metric',
              )
            }
            onUpdateMetric={(metricId, payload) =>
              run(
                hook.updateRow({ register: METRICS, id: metricId, data: payload }),
                'Metric updated',
                'Failed to update metric',
              )
            }
            onDeleteMetric={(metricId) =>
              run(
                hook.deleteRow({ register: METRICS, id: metricId }),
                'Metric deleted',
                'Failed to delete metric',
              )
            }
            onRecordMeasurement={(metricId, values) =>
              run(
                hook.createRow({
                  register: MEASUREMENTS,
                  data: {
                    metricId,
                    periodStart: values.periodStart,
                    value: values.value,
                    note: values.note || null,
                  },
                }),
                'Measurement recorded',
                'Failed to record measurement',
              )
            }
            onBulkSaveMeasurements={(rows) =>
              run(
                hook.bulkCreateMeasurements(rows),
                `Recorded ${rows.length} measurement${rows.length === 1 ? '' : 's'}`,
                'Failed to record measurements',
              )
            }
            onDeleteMeasurement={(measurementId) =>
              run(
                hook.deleteRow({ register: MEASUREMENTS, id: measurementId }),
                'Measurement deleted',
                'Failed to delete measurement',
              )
            }
          />
        );
      }}
    </IsmsDocumentShell>
  );
}
