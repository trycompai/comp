'use client';

import type { ChecklistItem } from '@/hooks/use-offboarding-checklist';
import { Badge, Button, Checkbox, HStack, Stack, Text } from '@trycompai/design-system';
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
  const completeFileInputRef = useRef<HTMLInputElement>(null);
  const evidenceFileInputRef = useRef<HTMLInputElement>(null);

  const handleCheckedChange = async (checked: boolean) => {
    if (isProcessing) return;

    if (checked && item.evidenceRequired) {
      completeFileInputRef.current?.click();
      return;
    }

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

  const handleCompleteWithFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    try {
      await onComplete({ templateItemId: item.templateItemId, file });
    } finally {
      setIsProcessing(false);
      if (completeFileInputRef.current) completeFileInputRef.current.value = '';
    }
  };

  const handleUploadEvidence = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    try {
      await onUploadEvidence(item.templateItemId, file);
    } finally {
      setIsProcessing(false);
      if (evidenceFileInputRef.current) evidenceFileInputRef.current.value = '';
    }
  };

  return (
    <div className="rounded-lg border p-4">
      <HStack gap="3" align="start">
        <div className="pt-0.5">
          <Checkbox
            checked={item.completed}
            onCheckedChange={handleCheckedChange}
            disabled={!canEdit || isProcessing}
          />
        </div>
        <div className="flex-1 min-w-0">
        <Stack gap="2">
          <Stack gap="1">
            <HStack gap="2" align="center">
              <Text weight="medium">{item.title}</Text>
              {item.evidenceRequired && (
                <Badge variant="outline">Evidence required</Badge>
              )}
            </HStack>
            {item.description && <Text variant="muted">{item.description}</Text>}
          </Stack>

          {item.completed && item.completedBy && item.completedAt && (
            <Text variant="muted">
              Completed by {item.completedBy.name} on{' '}
              {format(new Date(item.completedAt), 'MMM d, yyyy')}
            </Text>
          )}

          {item.completed && item.evidence.length > 0 && (
            <Stack gap="1">
              {item.evidence.map((file) => (
                <HStack key={file.id} gap="2" align="center">
                  <Text variant="muted">{file.name}</Text>
                  <div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onDownload(file.id)}
                    >
                      <DocumentDownload size={16} />
                    </Button>
                  </div>
                </HStack>
              ))}
            </Stack>
          )}

          {item.completed && canEdit && (
            <div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => evidenceFileInputRef.current?.click()}
                disabled={isProcessing}
                iconLeft={<Upload size={16} />}
              >
                Add evidence
              </Button>
            </div>
          )}
        </Stack>
        </div>
      </HStack>

      <input
        ref={completeFileInputRef}
        type="file"
        className="hidden"
        onChange={handleCompleteWithFile}
        accept=".pdf,.doc,.docx,.png,.jpg,.jpeg,.csv,.xlsx"
      />
      <input
        ref={evidenceFileInputRef}
        type="file"
        className="hidden"
        onChange={handleUploadEvidence}
        accept=".pdf,.doc,.docx,.png,.jpg,.jpeg,.csv,.xlsx"
      />
    </div>
  );
}
