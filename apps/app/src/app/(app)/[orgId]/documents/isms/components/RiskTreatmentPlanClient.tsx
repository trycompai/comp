'use client';

import { Alert, AlertDescription, AlertTitle, Spinner, Stack, Text } from '@trycompai/design-system';
import { WarningAlt } from '@trycompai/design-system/icons';
import Link from 'next/link';
import type { IsmsDocument as IsmsDocumentData } from '../isms-types';
import { useIsmsRiskTreatment } from '../hooks/useIsmsRiskTreatment';
import { IsmsDocumentShell } from './IsmsDocumentShell';
import type { ApproverOption } from './IsmsApprovalSection';
import { RiskTreatmentTable } from './RiskTreatmentTable';

interface RiskTreatmentPlanClientProps {
  organizationId: string;
  documentId: string;
  fallbackData: IsmsDocumentData | null;
  currentMemberId: string | null;
  approverOptions: ApproverOption[];
}

/**
 * The Risk Treatment Plan (6.1.3) detail page. Unlike the other ISMS documents
 * there is nothing to edit here: the plan renders live from the Risk Register
 * and the Vendors module (per-row acceptance state included), so the body is a
 * preview of exactly what exports, plus pointers back to where the data is
 * maintained. Submit-readiness comes from the server with the rows.
 */
export function RiskTreatmentPlanClient(props: RiskTreatmentPlanClientProps) {
  const { organizationId, documentId } = props;
  const { riskTreatment, error, isLoading, mutateRiskTreatment } =
    useIsmsRiskTreatment(documentId);

  // null = ready to submit. Fail closed: a load/revalidation error blocks
  // submission even when stale cached data is still present (SWR keeps the
  // previous data on a failed revalidate), and loading blocks until the
  // server has confirmed readiness.
  const blockedReason = error
    ? 'The readiness check could not be loaded — refresh the page and try again.'
    : riskTreatment
      ? riskTreatment.validationMessages.length > 0
        ? riskTreatment.validationMessages.join(' ')
        : null
      : 'Checking the plan is ready to submit...';

  return (
    <IsmsDocumentShell
      {...props}
      clause="6.1.3"
      title="Risk Treatment Plan"
      description="The treatment, controls, owner, residual risk state and owner acceptance for every risk — generated from the Risk Register and Vendors (ISO 27001 clause 6.1.3). No separate data entry: maintain the registers and regenerate."
      sectionTitle="Treatment plan preview"
      sectionDescription="Exactly what the exported document renders, from the current registers."
      generateSuccessMessage="Refreshed the plan from the current registers"
      getSubmitBlockedReason={() => blockedReason}
      onGenerated={() => mutateRiskTreatment()}
    >
      {() => (
        <Stack gap="6">
          {riskTreatment && riskTreatment.validationMessages.length > 0 && (
            <Alert variant="warning" icon={<WarningAlt />}>
              <AlertTitle>Not ready to submit</AlertTitle>
              <AlertDescription>
                <ul className="list-disc pl-4">
                  {riskTreatment.validationMessages.map((message) => (
                    <li key={message}>{message}</li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}

          {!riskTreatment && isLoading && (
            <div className="flex items-center justify-center py-12">
              <Spinner />
            </div>
          )}

          {!riskTreatment && !isLoading && error && (
            <Alert variant="destructive" icon={<WarningAlt />}>
              <AlertTitle>Couldn&apos;t load the treatment plan data</AlertTitle>
              <AlertDescription>
                {error instanceof Error ? error.message : 'Something went wrong.'}
              </AlertDescription>
            </Alert>
          )}

          {riskTreatment && (
            <>
              <div className="flex flex-col gap-2">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <Text weight="semibold">Organisational risks</Text>
                  <Link
                    href={`/${organizationId}/risk`}
                    className="text-sm text-primary hover:underline"
                  >
                    Manage in the Risk Register →
                  </Link>
                </div>
                <RiskTreatmentTable
                  keyHeader="Ref"
                  showTitle
                  rows={riskTreatment.risks.map((risk) => ({
                    key: risk.reference,
                    ...risk,
                  }))}
                  emptyText="No risks recorded in the Risk Register yet."
                />
              </div>

              <div className="flex flex-col gap-2">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <Text weight="semibold">Supplier risks</Text>
                  <Link
                    href={`/${organizationId}/vendors`}
                    className="text-sm text-primary hover:underline"
                  >
                    Manage in Vendors →
                  </Link>
                </div>
                <RiskTreatmentTable
                  keyHeader="Vendor"
                  showTitle={false}
                  rows={riskTreatment.vendors.map((vendor) => ({
                    key: vendor.name,
                    title: vendor.name,
                    ...vendor,
                  }))}
                  emptyText="No vendors recorded yet."
                />
              </div>

              <Text variant="muted">
                Rows without a recorded acceptance export as &quot;Awaiting acceptance&quot;;
                acceptance is recommended but never blocks generation. When a risk&apos;s residual
                rating changes after acceptance, the prior acceptance is marked stale and must be
                re-recorded from the risk&apos;s detail page.
              </Text>
            </>
          )}
        </Stack>
      )}
    </IsmsDocumentShell>
  );
}
