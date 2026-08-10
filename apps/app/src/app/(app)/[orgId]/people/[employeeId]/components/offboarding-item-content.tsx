'use client';

import type { ChecklistItem } from '@/hooks/use-offboarding-checklist';
import { Button, HStack, Stack, Text } from '@trycompai/design-system';
import { DocumentDownload, Upload } from '@trycompai/design-system/icons';
import { useState } from 'react';
import { ExceptionReasonForm } from './ExceptionReasonForm';

/** Shown once a step has been resolved as an exception: the reason + a way to undo. */
function ExceptionResolvedView({
  reason,
  canEdit,
  isProcessing,
  onRemove,
}: {
  reason: string | null;
  canEdit: boolean;
  isProcessing: boolean;
  onRemove: () => void;
}) {
  return (
    <Stack gap="2">
      <Stack gap="1">
        <Text size="xs" variant="muted">
          Marked as exception
        </Text>
        {reason && <Text size="sm">{reason}</Text>}
      </Stack>
      {canEdit && (
        <div>
          <Button
            variant="outline"
            size="sm"
            onClick={onRemove}
            disabled={isProcessing}
            loading={isProcessing}
          >
            Remove exception
          </Button>
        </div>
      )}
    </Stack>
  );
}

export function SimpleContent({
  item,
  canEdit,
  isProcessing,
  onComplete,
  onUncomplete,
  onMarkException,
}: {
  item: ChecklistItem;
  canEdit: boolean;
  isProcessing: boolean;
  onComplete: () => void;
  onUncomplete: () => void;
  onMarkException: (reason: string) => Promise<void>;
}) {
  const [showExceptionForm, setShowExceptionForm] = useState(false);

  if (item.isException) {
    return (
      <ExceptionResolvedView
        reason={item.exceptionReason}
        canEdit={canEdit}
        isProcessing={isProcessing}
        onRemove={onUncomplete}
      />
    );
  }

  if (!canEdit) return null;

  if (item.completed) {
    return (
      <div>
        <Button
          variant="outline"
          size="sm"
          onClick={onUncomplete}
          disabled={isProcessing}
          loading={isProcessing}
        >
          Undo
        </Button>
      </div>
    );
  }

  if (showExceptionForm) {
    return (
      <ExceptionReasonForm
        onSubmit={async (reason) => {
          await onMarkException(reason);
          setShowExceptionForm(false);
        }}
        onCancel={() => setShowExceptionForm(false)}
        isSubmitting={isProcessing}
      />
    );
  }

  return (
    <HStack gap="2">
      <Button
        size="sm"
        onClick={onComplete}
        disabled={isProcessing}
        loading={isProcessing}
      >
        Mark complete
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setShowExceptionForm(true)}
        disabled={isProcessing}
      >
        Mark as exception
      </Button>
    </HStack>
  );
}

export function EvidenceContent({
  item,
  canEdit,
  isProcessing,
  dropzoneInputRef,
  onFileDrop,
  onFileSelect,
  onDownload,
  onUncomplete,
  onMarkException,
}: {
  item: ChecklistItem;
  canEdit: boolean;
  isProcessing: boolean;
  dropzoneInputRef: React.RefObject<HTMLInputElement | null>;
  onFileDrop: (e: React.DragEvent<HTMLDivElement>) => void;
  onFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onDownload: (attachmentId: string) => void;
  onUncomplete: () => void;
  onMarkException: (reason: string) => Promise<void>;
}) {
  const [showExceptionForm, setShowExceptionForm] = useState(false);

  if (item.isException) {
    return (
      <ExceptionResolvedView
        reason={item.exceptionReason}
        canEdit={canEdit}
        isProcessing={isProcessing}
        onRemove={onUncomplete}
      />
    );
  }

  return (
    <Stack gap="3">
      {item.evidence.length > 0 && (
        <Stack gap="1">
          {item.evidence.map((file) => (
            <HStack key={file.id} gap="2" align="center">
              <Text size="sm" variant="muted">
                {file.name}
              </Text>
              <div>
                <Button
                  variant="ghost"
                  size="icon-xs"
                  onClick={() => onDownload(file.id)}
                >
                  <DocumentDownload size={14} />
                </Button>
              </div>
            </HStack>
          ))}
        </Stack>
      )}

      {canEdit && (
        <div
          onDrop={onFileDrop}
          onDragOver={(e) => e.preventDefault()}
          onClick={() => !isProcessing && dropzoneInputRef.current?.click()}
          className={`flex cursor-pointer flex-col items-center gap-2 rounded-md border-2 border-dashed border-muted-foreground/25 px-4 py-6 text-center transition hover:border-muted-foreground/50 hover:bg-muted/25${isProcessing ? ' pointer-events-none opacity-50' : ''}`}
        >
          <Upload size={20} className="text-muted-foreground" />
          <div>
            <Text size="sm" variant="muted">
              {item.completed
                ? 'Drop files here or click to add more evidence'
                : 'Drop files here or click to upload proof and mark as complete'}
            </Text>
          </div>
          <input
            ref={dropzoneInputRef}
            type="file"
            className="hidden"
            onChange={onFileSelect}
            accept=".pdf,.doc,.docx,.png,.jpg,.jpeg,.csv,.xlsx"
          />
        </div>
      )}

      {item.completed && canEdit && (
        <div>
          <Button
            variant="outline"
            size="sm"
            onClick={onUncomplete}
            disabled={isProcessing}
            loading={isProcessing}
          >
            Undo completion
          </Button>
        </div>
      )}

      {!item.completed &&
        canEdit &&
        (showExceptionForm ? (
          <ExceptionReasonForm
            onSubmit={async (reason) => {
              await onMarkException(reason);
              setShowExceptionForm(false);
            }}
            onCancel={() => setShowExceptionForm(false)}
            isSubmitting={isProcessing}
          />
        ) : (
          <div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowExceptionForm(true)}
              disabled={isProcessing}
            >
              Can&apos;t complete this? Mark as exception
            </Button>
          </div>
        ))}
    </Stack>
  );
}
