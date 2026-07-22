'use client';

import { Alert, Button, Stack, Text } from '@trycompai/design-system';
import { Add, ListChecked, WarningAlt } from '@trycompai/design-system/icons';
import { useState } from 'react';
import type { IsmsAudit } from '../isms-types';
import { AuditCard, type AuditHandlers } from './AuditCard';
import type { ApproverOption } from './IsmsApprovalSection';
import { IsmsRegisterShell } from './shared';

interface AuditsListProps extends AuditHandlers {
  audits: IsmsAudit[];
  canEdit: boolean;
  memberOptions: ApproverOption[];
  auditorOptions: string[];
  validationMessages: string[];
  onCreateAudit: () => Promise<void>;
}

/**
 * The Audits register (clause 9.2): a list of audit instances, each expanding
 * to its plan fields, Controls Tested table, findings, and sign-off. "New
 * audit" creates an instance pre-filled with the full template — reference,
 * scope, criteria, and the fifteen default Controls Tested rows.
 */
export function AuditsList({
  audits,
  canEdit,
  memberOptions,
  auditorOptions,
  validationMessages,
  onCreateAudit,
  ...handlers
}: AuditsListProps) {
  const [isCreating, setIsCreating] = useState(false);

  const handleCreate = async () => {
    setIsCreating(true);
    try {
      await onCreateAudit();
    } catch {
      // Error already surfaced via toast by the caller.
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <Stack gap="4">
      {validationMessages.length > 0 ? (
        <Alert variant="warning" icon={<WarningAlt />}>
          <Text size="sm">
            Before the Clause 9.2 document can be submitted:{' '}
            {validationMessages.join(' ')}
          </Text>
        </Alert>
      ) : null}

      <IsmsRegisterShell
        title="Audits"
        count={audits.length}
        emptyIcon={ListChecked}
        emptyTitle="No audits yet"
        emptyDescription="Create your first internal audit — it opens pre-filled with the full template, including the default sample of fifteen controls to test."
        footer={
          canEdit ? (
            <div className="flex">
              <Button
                type="button"
                variant="secondary"
                onClick={() => void handleCreate()}
                disabled={isCreating}
                loading={isCreating}
                iconLeft={<Add size={16} />}
              >
                New audit
              </Button>
            </div>
          ) : undefined
        }
      >
        <Stack gap="3">
          {audits.map((audit) => (
            <AuditCard
              key={audit.id}
              audit={audit}
              canEdit={canEdit}
              memberOptions={memberOptions}
              auditorOptions={auditorOptions}
              {...handlers}
            />
          ))}
        </Stack>
      </IsmsRegisterShell>
    </Stack>
  );
}
