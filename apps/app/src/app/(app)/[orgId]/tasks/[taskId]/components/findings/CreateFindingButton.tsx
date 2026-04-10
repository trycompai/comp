'use client';

import type { EvidenceFormType } from '@trycompai/company';
import { Button } from '@trycompai/design-system';
import { Plus } from 'lucide-react';
import { useState } from 'react';
import { CreateFindingSheet } from './CreateFindingSheet';

interface CreateFindingButtonProps {
  taskId?: string;
  evidenceSubmissionId?: string;
  evidenceFormType?: EvidenceFormType;
  showScope?: boolean;
  onSuccess?: () => void;
}

export function CreateFindingButton({
  taskId,
  evidenceSubmissionId,
  evidenceFormType,
  showScope = false,
  onSuccess,
}: CreateFindingButtonProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button variant="default" size="icon-sm" onClick={() => setOpen(true)} title="Create Finding">
        <Plus className="h-4 w-4 text-white" strokeWidth={2.5} />
      </Button>
      <CreateFindingSheet
        taskId={taskId}
        evidenceSubmissionId={evidenceSubmissionId}
        evidenceFormType={evidenceFormType}
        showScope={showScope}
        open={open}
        onOpenChange={setOpen}
        onSuccess={onSuccess}
      />
    </>
  );
}
