'use client';

import { Button } from '@trycompai/design-system';
import { Plus } from 'lucide-react';
import { useState } from 'react';
import { CreateFindingSheet } from './CreateFindingSheet';

interface CreateFindingButtonProps {
  taskId?: string;
  evidenceSubmissionId?: string;
  onSuccess?: () => void;
}

export function CreateFindingButton({
  taskId,
  evidenceSubmissionId,
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
        open={open}
        onOpenChange={setOpen}
        onSuccess={onSuccess}
      />
    </>
  );
}
