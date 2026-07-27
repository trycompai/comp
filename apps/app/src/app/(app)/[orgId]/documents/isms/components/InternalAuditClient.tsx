'use client';

import { Stack } from '@trycompai/design-system';
import { toast } from 'sonner';
import type { IsmsDocument as IsmsDocumentData } from '../isms-types';
import { AuditsList } from './AuditsList';
import type { AuditHandlers } from './AuditCard';
import type { ApproverOption } from './IsmsApprovalSection';
import { IsmsDocumentShell } from './IsmsDocumentShell';
import { ProgrammeCard } from './ProgrammeCard';
import {
  toAuditPayload,
  toControlPayload,
  toFindingPayload,
  toSignoffPayload,
} from './audit-schema';
import { auditValidationMessages } from './internal-audit-constants';

interface InternalAuditClientProps {
  organizationId: string;
  documentId: string;
  fallbackData: IsmsDocumentData | null;
  currentMemberId: string | null;
  approverOptions: ApproverOption[];
  memberOptions: ApproverOption[];
  /** Internal Auditor holder(s) from ISMS > Roles (5.3) — the auditor dropdown. */
  auditorOptions?: string[];
}

const AUDITS = 'audits' as const;
const CONTROLS = 'audit-controls' as const;
const FINDINGS = 'audit-findings' as const;

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

export function InternalAuditClient({
  memberOptions,
  auditorOptions = [],
  ...props
}: InternalAuditClientProps) {
  return (
    <IsmsDocumentShell
      {...props}
      clause="9.2"
      title="Internal Audit"
      description="Plan and record the internal audits of the ISMS (ISO 27001 clause 9.2). Each audit samples the controls below — follow the 'Where to find it' reference, verify the evidence, and record a result per row. Findings are tracked to closure."
      sectionTitle="Audit programme"
      sectionDescription="One annual full audit of the whole ISMS is the default shape. Every field ships with auditor-defensible template text you can accept or edit."
      generateSuccessMessage="Restored the default programme text"
      getSubmitBlockedReason={(document) => {
        const messages = auditValidationMessages({
          audits: Array.isArray(document.audits) ? document.audits : [],
        });
        return messages.length > 0
          ? `Complete the audit programme before submitting: ${messages.join(' ')}`
          : null;
      }}
    >
      {({ document, canManage, hook }) => {
        const audits = Array.isArray(document.audits) ? document.audits : [];
        const validationMessages = auditValidationMessages({ audits });

        const handlers: AuditHandlers = {
          onUpdateAudit: (auditId, values) =>
            run(
              hook.updateRow({ register: AUDITS, id: auditId, data: toAuditPayload(values) }),
              'Audit updated',
              'Failed to update audit',
            ),
          onDeleteAudit: (auditId) =>
            run(
              hook.deleteRow({ register: AUDITS, id: auditId }),
              'Audit deleted',
              'Failed to delete audit',
            ),
          onSaveSignoff: (auditId, values) =>
            run(
              hook.updateRow({ register: AUDITS, id: auditId, data: toSignoffPayload(values) }),
              'Sign-off saved',
              'Failed to save sign-off',
            ),
          onCreateControl: (auditId, values) =>
            run(
              hook.createRow({
                register: CONTROLS,
                data: { auditId, ...toControlPayload(values) },
              }),
              'Control row added',
              'Failed to add control row',
            ),
          onUpdateControl: (controlId, payload) =>
            run(
              hook.updateRow({ register: CONTROLS, id: controlId, data: payload }),
              'Control row updated',
              'Failed to update control row',
            ),
          onDeleteControl: (controlId) =>
            run(
              hook.deleteRow({ register: CONTROLS, id: controlId }),
              'Control row deleted',
              'Failed to delete control row',
            ),
          onCreateFinding: (auditId, values) =>
            run(
              hook.createRow({
                register: FINDINGS,
                data: { auditId, ...toFindingPayload(values) },
              }),
              'Finding added',
              'Failed to add finding',
            ),
          onUpdateFinding: (findingId, values) =>
            run(
              hook.updateRow({
                register: FINDINGS,
                id: findingId,
                data: toFindingPayload(values),
              }),
              'Finding updated',
              'Failed to update finding',
            ),
          onDeleteFinding: (findingId) =>
            run(
              hook.deleteRow({ register: FINDINGS, id: findingId }),
              'Finding deleted',
              'Failed to delete finding',
            ),
        };

        return (
          <Stack gap="6">
            <ProgrammeCard
              narrative={document.draftNarrative}
              canEdit={canManage}
              onSave={(programme) =>
                run(
                  hook.saveNarrative({ programme }),
                  'Programme saved',
                  'Failed to save programme',
                )
              }
            />
            <AuditsList
              audits={audits}
              canEdit={canManage}
              memberOptions={memberOptions}
              auditorOptions={auditorOptions}
              validationMessages={validationMessages}
              onCreateAudit={() =>
                run(
                  hook.createRow({ register: AUDITS, data: {} }),
                  'Audit created with the default template',
                  'Failed to create audit',
                )
              }
              {...handlers}
            />
          </Stack>
        );
      }}
    </IsmsDocumentShell>
  );
}
