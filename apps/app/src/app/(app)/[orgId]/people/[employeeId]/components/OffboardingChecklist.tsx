'use client';

import { useOffboardingChecklist } from '@/hooks/use-offboarding-checklist';
import { HStack, Label, Section, Stack, Switch, Text } from '@trycompai/design-system';
import { useCallback, useState } from 'react';
import { toast } from 'sonner';
import { OffboardingChecklistItem } from './OffboardingChecklistItem';
import { OffboardingSummaryCard } from './OffboardingSummaryCard';

interface OffboardingChecklistProps {
  memberId: string;
  canEdit: boolean;
  offboardDate: string;
}

export function OffboardingChecklist({
  memberId,
  canEdit,
  offboardDate,
}: OffboardingChecklistProps) {
  const {
    checklist,
    isLoading,
    completeItem,
    uncompleteItem,
    uploadEvidence,
    getDownloadUrl,
    refreshChecklist,
  } = useOffboardingChecklist(memberId);

  const [showOnlyRemaining, setShowOnlyRemaining] = useState(false);

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
      <Section
        title="Offboarding Checklist"
        description="Track tasks required to complete this offboarding."
      >
        <Text variant="muted">Loading checklist...</Text>
      </Section>
    );
  }

  if (!checklist || checklist.items.length === 0) {
    return (
      <Section
        title="Offboarding Checklist"
        description="Track tasks required to complete this offboarding."
      >
        <Text variant="muted">
          No checklist items configured. Add items in the offboarding checklist
          settings.
        </Text>
      </Section>
    );
  }

  const filteredItems = showOnlyRemaining
    ? checklist.items.filter((item) => !item.completed)
    : checklist.items;

  return (
    <Stack gap="6">
      {offboardDate && (
        <OffboardingSummaryCard
          offboardDate={offboardDate}
          totalItems={checklist.totalItems}
          completedItems={checklist.completedItems}
        />
      )}

      <Stack gap="4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-normal">Offboarding checklist</h3>
            <p className="text-sm text-muted-foreground">
              Track tasks required to complete this offboarding.
            </p>
          </div>
          <HStack gap="2" align="center">
            <Label htmlFor="show-remaining">
              <Text size="sm">Show only remaining</Text>
            </Label>
            <Switch
              id="show-remaining"
              checked={showOnlyRemaining}
              onCheckedChange={setShowOnlyRemaining}
              size="sm"
            />
          </HStack>
        </div>

        <div className="flex flex-col gap-2">
          {filteredItems.map((item) => (
            <OffboardingChecklistItem
              key={item.templateItemId}
              item={item}
              memberId={memberId}
              canEdit={canEdit}
              onComplete={handleComplete}
              onUncomplete={handleUncomplete}
              onUploadEvidence={handleUploadEvidence}
              onDownload={handleDownload}
              onChecklistRefresh={() => refreshChecklist()}
            />
          ))}
          {filteredItems.length === 0 && showOnlyRemaining && (
            <div className="rounded-lg border px-4 py-8 text-center">
              <Text variant="muted">
                All tasks completed. Turn off the filter to see all items.
              </Text>
            </div>
          )}
        </div>
      </Stack>
    </Stack>
  );
}
