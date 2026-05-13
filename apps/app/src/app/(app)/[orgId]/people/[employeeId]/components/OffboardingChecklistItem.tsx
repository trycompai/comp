'use client';

import type { ChecklistItem } from '@/hooks/use-offboarding-checklist';
import {
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
  Badge,
  Button,
  HStack,
  Stack,
  Text,
} from '@trycompai/design-system';
import { DocumentDownload, Upload } from '@trycompai/design-system/icons';
import { format } from 'date-fns';
import { useRef, useState } from 'react';

interface OffboardingChecklistItemProps {
  item: ChecklistItem;
  canEdit: boolean;
  onComplete: (args: { templateItemId: string; file?: File }) => Promise<void>;
  onUncomplete: (templateItemId: string) => Promise<void>;
  onUploadEvidence: (templateItemId: string, file: File) => Promise<void>;
  onDownload: (attachmentId: string) => Promise<void>;
}

function StatusBadge({ item }: { item: ChecklistItem }) {
  if (item.completed) return <Badge variant="default">Complete</Badge>;
  if (item.evidenceRequired) return <Badge variant="destructive">Evidence required</Badge>;
  return <Badge variant="secondary">Pending</Badge>;
}

function CompletionInfo({ item }: { item: ChecklistItem }) {
  if (!item.completed || !item.completedBy || !item.completedAt) return null;
  return (
    <Text size="xs" variant="muted">
      Completed by {item.completedBy.name} on{' '}
      {format(new Date(item.completedAt), 'MMM d, yyyy')}
      {item.evidence.length > 0 &&
        ` · ${item.evidence.length} file${item.evidence.length !== 1 ? 's' : ''} attached`}
    </Text>
  );
}

export function OffboardingChecklistItem({
  item,
  canEdit,
  onComplete,
  onUncomplete,
  onUploadEvidence,
  onDownload,
}: OffboardingChecklistItemProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const dropzoneInputRef = useRef<HTMLInputElement>(null);

  const handleComplete = async () => {
    if (isProcessing) return;
    setIsProcessing(true);
    try {
      await onComplete({ templateItemId: item.templateItemId });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleUncomplete = async () => {
    if (isProcessing) return;
    setIsProcessing(true);
    try {
      await onUncomplete(item.templateItemId);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFileDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (!file) return;
    await handleFileUpload(file);
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await handleFileUpload(file);
    if (dropzoneInputRef.current) dropzoneInputRef.current.value = '';
  };

  const handleFileUpload = async (file: File) => {
    setIsProcessing(true);
    try {
      if (!item.completed) {
        await onComplete({ templateItemId: item.templateItemId, file });
      } else {
        await onUploadEvidence(item.templateItemId, file);
      }
    } finally {
      setIsProcessing(false);
    }
  };

  if (!item.evidenceRequired) {
    return (
      <div className="flex items-center justify-between rounded-lg border px-4 py-3">
        <Stack gap="1">
          <HStack gap="2" align="center">
            <span className="text-sm font-medium">{item.title}</span>
            <StatusBadge item={item} />
          </HStack>
          {item.description && (
            <Text size="sm" variant="muted">{item.description}</Text>
          )}
          <CompletionInfo item={item} />
        </Stack>
        {canEdit && (
          <div className="shrink-0 pl-4">
            {item.completed ? (
              <div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleUncomplete}
                  disabled={isProcessing}
                  loading={isProcessing}
                >
                  Undo
                </Button>
              </div>
            ) : (
              <div>
                <Button
                  size="sm"
                  onClick={handleComplete}
                  disabled={isProcessing}
                  loading={isProcessing}
                >
                  Mark complete
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <AccordionItem value={item.templateItemId}>
      <AccordionTrigger>
        <Stack gap="1">
          <HStack gap="2" align="center">
            <span className="text-sm font-medium">{item.title}</span>
            <StatusBadge item={item} />
          </HStack>
          {item.description && (
            <Text size="sm" variant="muted">{item.description}</Text>
          )}
          <CompletionInfo item={item} />
        </Stack>
      </AccordionTrigger>
      <AccordionContent>
        <Stack gap="3">
          {item.evidence.length > 0 && (
            <Stack gap="1">
              {item.evidence.map((file) => (
                <HStack key={file.id} gap="2" align="center">
                  <Text size="sm" variant="muted">{file.name}</Text>
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
              onDrop={handleFileDrop}
              onDragOver={(e) => e.preventDefault()}
              onClick={() => dropzoneInputRef.current?.click()}
              className="flex cursor-pointer flex-col items-center gap-2 rounded-md border-2 border-dashed border-muted-foreground/25 px-4 py-6 text-center transition hover:border-muted-foreground/50 hover:bg-muted/25"
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
                onChange={handleFileSelect}
                accept=".pdf,.doc,.docx,.png,.jpg,.jpeg,.csv,.xlsx"
              />
            </div>
          )}

          {item.completed && canEdit && (
            <div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleUncomplete}
                disabled={isProcessing}
                loading={isProcessing}
              >
                Undo completion
              </Button>
            </div>
          )}
        </Stack>
      </AccordionContent>
    </AccordionItem>
  );
}
