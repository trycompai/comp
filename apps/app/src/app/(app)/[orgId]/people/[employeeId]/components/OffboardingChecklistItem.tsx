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

  const handleCheckedChange = async (checked: boolean) => {
    if (isProcessing) return;

    if (checked && item.evidenceRequired) return;

    setIsProcessing(true);
    try {
      if (checked) {
        await onComplete({ templateItemId: item.templateItemId });
      } else {
        await onUncomplete(item.templateItemId);
      }
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

  return (
    <AccordionItem value={item.templateItemId}>
      <AccordionTrigger>
        <Stack gap="1">
          <HStack gap="2" align="center">
            <span className="font-medium text-sm">{item.title}</span>
            {item.completed ? (
              <Badge variant="default">Complete</Badge>
            ) : (
              <Badge variant="outline">Pending</Badge>
            )}
            {item.evidenceRequired && !item.completed && (
              <Badge variant="outline">Evidence required</Badge>
            )}
          </HStack>
          {item.description && (
            <Text size="sm" variant="muted">{item.description}</Text>
          )}
          {item.completed && item.completedBy && item.completedAt && (
            <Text size="xs" variant="muted">
              Completed by {item.completedBy.name} on{' '}
              {format(new Date(item.completedAt), 'MMM d, yyyy')}
              {item.evidence.length > 0 && ` · ${item.evidence.length} file${item.evidence.length !== 1 ? 's' : ''} attached`}
            </Text>
          )}
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

              {canEdit && (item.evidenceRequired || item.completed) && (
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

              {canEdit && (
                <HStack gap="2">
                  {!item.completed && !item.evidenceRequired && (
                    <div>
                      <Button
                        onClick={() => handleCheckedChange(true)}
                        disabled={isProcessing}
                        loading={isProcessing}
                      >
                        Mark as complete
                      </Button>
                    </div>
                  )}
                  {item.completed && (
                    <div>
                      <Button
                        variant="outline"
                        onClick={() => handleCheckedChange(false)}
                        disabled={isProcessing}
                        loading={isProcessing}
                      >
                        Undo completion
                      </Button>
                    </div>
                  )}
                </HStack>
              )}
            </Stack>
          </AccordionContent>
    </AccordionItem>
  );
}
