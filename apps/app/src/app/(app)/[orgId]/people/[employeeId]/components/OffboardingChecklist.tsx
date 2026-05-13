'use client';

import { useOffboardingChecklist } from '@/hooks/use-offboarding-checklist';
import { Accordion, Progress, Section, Stack, Text } from '@trycompai/design-system';
import { useCallback } from 'react';
import { toast } from 'sonner';
import { OffboardingChecklistItem } from './OffboardingChecklistItem';

interface OffboardingChecklistProps {
  memberId: string;
  canEdit: boolean;
}

export function OffboardingChecklist({ memberId, canEdit }: OffboardingChecklistProps) {
  const {
    checklist,
    isLoading,
    completeItem,
    uncompleteItem,
    uploadEvidence,
    getDownloadUrl,
  } = useOffboardingChecklist(memberId);

  const handleComplete = useCallback(
    async ({ templateItemId, file }: { templateItemId: string; file?: File }) => {
      try {
        await completeItem({ templateItemId, file });
        toast.success('Item completed');
      } catch {
        toast.error('Failed to complete item');
      }
    },
    [completeItem],
  );

  const handleUncomplete = useCallback(
    async (templateItemId: string) => {
      try {
        await uncompleteItem(templateItemId);
        toast.success('Item uncompleted');
      } catch {
        toast.error('Failed to uncomplete item');
      }
    },
    [uncompleteItem],
  );

  const handleUploadEvidence = useCallback(
    async (templateItemId: string, file: File) => {
      try {
        await uploadEvidence(templateItemId, file);
        toast.success('Evidence uploaded');
      } catch {
        toast.error('Failed to upload evidence');
      }
    },
    [uploadEvidence],
  );

  const handleDownload = useCallback(
    async (attachmentId: string) => {
      try {
        const url = await getDownloadUrl(attachmentId);
        window.open(url, '_blank');
      } catch {
        toast.error('Failed to download file');
      }
    },
    [getDownloadUrl],
  );

  if (isLoading) {
    return (
      <Section title="Offboarding Checklist" description="Track offboarding tasks for this member.">
        <Text variant="muted">Loading checklist...</Text>
      </Section>
    );
  }

  if (!checklist || checklist.items.length === 0) {
    return (
      <Section title="Offboarding Checklist" description="Track offboarding tasks for this member.">
        <Text variant="muted">
          No checklist items configured. Add items in the offboarding checklist settings.
        </Text>
      </Section>
    );
  }

  const progressValue =
    checklist.totalItems > 0
      ? Math.round((checklist.completedItems / checklist.totalItems) * 100)
      : 0;

  return (
    <Section title="Offboarding Checklist" description="Track offboarding tasks for this member.">
      <Stack gap="4">
        <Stack gap="2">
          <Text variant="muted">
            {checklist.completedItems} of {checklist.totalItems} items completed
          </Text>
          <Progress value={progressValue} />
        </Stack>

        <Accordion type="multiple">
          {checklist.items.map((item) => (
            <OffboardingChecklistItem
              key={item.templateItemId}
              item={item}
              canEdit={canEdit}
              onComplete={handleComplete}
              onUncomplete={handleUncomplete}
              onUploadEvidence={handleUploadEvidence}
              onDownload={handleDownload}
            />
          ))}
        </Accordion>
      </Stack>
    </Section>
  );
}
