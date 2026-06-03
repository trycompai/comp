'use client';

import { apiClient } from '@/lib/api-client';
import { Badge, Button, Grid, HStack, Stack, Text } from '@trycompai/design-system';
import type { ReactNode } from 'react';
import { toast } from 'sonner';
import useSWR from 'swr';
import { BackgroundCheckReport } from './BackgroundCheckReport';
import {
  type BackgroundCheckRecord,
  type BackgroundCheckStatus,
  type CustomBackgroundCheckAttachment,
  isCompletedBackgroundCheck,
} from './backgroundCheckTypes';

const STATUS_LABELS: Record<BackgroundCheckStatus, string> = {
  invited: 'Invite sent',
  in_progress: 'In progress',
  in_review: 'In review',
  completed: 'Complete',
  completed_with_flags: 'Complete with flags',
  failed: 'Failed',
  cancelled: 'Cancelled',
};

const COMPONENT_LABELS = [
  ['identityStatus', 'Identity'],
  ['employmentStatus', 'Employment'],
  ['referenceStatus', 'References'],
] as const;

export function BackgroundCheckStatusView({
  backgroundCheck,
  confirmation,
  memberId,
  organizationId,
  actions,
}: {
  backgroundCheck: BackgroundCheckRecord;
  confirmation?: string | null;
  memberId?: string;
  organizationId?: string;
  actions?: ReactNode;
}) {
  const isComplete = isCompletedBackgroundCheck(backgroundCheck.status);
  const customAttachmentsKey =
    isComplete && memberId && organizationId
      ? ([`/v1/people/${memberId}/background-check/custom-attachments`, organizationId] as const)
      : null;
  const { data: customAttachments, isLoading: isCustomAttachmentsLoading } = useSWR<
    CustomBackgroundCheckAttachment[],
    Error,
    readonly [string, string] | null
  >(customAttachmentsKey, async ([endpoint, orgId]) => {
    const response = await apiClient.get<CustomBackgroundCheckAttachment[]>(endpoint, orgId);
    if (response.error) {
      throw new Error('Failed to load custom background check attachments');
    }
    return response.data ?? [];
  });

  const handleCopyCandidateLink = async () => {
    if (!backgroundCheck.candidateUrl) return;

    try {
      await navigator.clipboard.writeText(backgroundCheck.candidateUrl);
      toast.success('Candidate link copied');
    } catch {
      toast.error('Could not copy candidate link');
    }
  };

  return (
    <Stack gap="xl">
      {confirmation && (
        <div className="rounded-md border border-primary/20 bg-primary/5 p-4">
          <Stack gap="xs">
            <Text weight="medium">Background check requested</Text>
            <Text size="sm" variant="muted">
              {confirmation}
            </Text>
          </Stack>
        </div>
      )}

      <div className="rounded-md border bg-muted/20 p-4">
        <Stack gap="md">
          <HStack justify="between" align="start">
            <Stack gap="xs">
              <Text weight="medium">Status</Text>
              <HStack gap="2" align="center">
                <Badge variant="secondary">{STATUS_LABELS[backgroundCheck.status]}</Badge>
                {backgroundCheck.lastSyncedAt && (
                  <Text size="xs" variant="muted">
                    Updated {new Date(backgroundCheck.lastSyncedAt).toLocaleString()}
                  </Text>
                )}
              </HStack>
            </Stack>
            {backgroundCheck.candidateUrl && !isComplete && (
              <Button type="button" variant="outline" onClick={handleCopyCandidateLink}>
                Copy candidate link
              </Button>
            )}
          </HStack>

          <Grid cols={{ base: '1', md: '2' }} gap="4">
            <ReadOnlyField label="Employee name" value={backgroundCheck.employeeName} />
            <ReadOnlyField label="Personal email" value={backgroundCheck.employeeEmail} />
          </Grid>

          <ComponentStatuses backgroundCheck={backgroundCheck} />

          {actions}
        </Stack>
      </div>

      {backgroundCheck.requesterNotes && (
        <ReadOnlyField label="Additional information" value={backgroundCheck.requesterNotes} />
      )}

      {isComplete &&
        (backgroundCheck.reportSnapshot ? (
          <BackgroundCheckReport
            snapshot={backgroundCheck.reportSnapshot}
            syncedAt={backgroundCheck.reportSyncedAt}
          />
        ) : isCustomAttachmentsLoading ? (
          <ReportSyncingState />
        ) : customAttachments && customAttachments.length > 0 ? (
          <CustomReportAttachments
            attachments={customAttachments}
            organizationId={organizationId ?? ''}
          />
        ) : (
          <ReportSyncingState />
        ))}
    </Stack>
  );
}

function CustomReportAttachments({
  attachments,
  organizationId,
}: {
  attachments: CustomBackgroundCheckAttachment[];
  organizationId: string;
}) {
  const handleDownload = async (attachmentId: string) => {
    const response = await apiClient.get<{ downloadUrl: string }>(
      `/v1/attachments/${attachmentId}/download`,
      organizationId,
    );

    if (response.error || !response.data?.downloadUrl) {
      toast.error('Failed to open background check');
      return;
    }

    window.open(response.data.downloadUrl, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="rounded-md border bg-muted/20 p-4">
      <Stack gap="md">
        <Stack gap="xs">
          <Text weight="medium">Custom background check</Text>
          <Text size="sm" variant="muted">
            Uploaded reports attached for this employee.
          </Text>
        </Stack>
        <Stack gap="sm">
          {attachments.map((attachment) => (
            <HStack key={attachment.id} justify="between" align="center">
              <Stack gap="xs">
                <Text size="sm">{attachment.name}</Text>
                <Text size="xs" variant="muted">
                  Uploaded {new Date(attachment.createdAt).toLocaleString()}
                </Text>
              </Stack>
              <Button type="button" variant="outline" onClick={() => handleDownload(attachment.id)}>
                Open
              </Button>
            </HStack>
          ))}
        </Stack>
      </Stack>
    </div>
  );
}

function ComponentStatuses({ backgroundCheck }: { backgroundCheck: BackgroundCheckRecord }) {
  const statuses = COMPONENT_LABELS.flatMap(([key, label]) => {
    const value = backgroundCheck[key];
    return value ? [{ label, value }] : [];
  });

  if (statuses.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2">
      {statuses.map(({ label, value }) => (
        <Badge key={label} variant="secondary">
          {label}: {formatLabel(value)}
        </Badge>
      ))}
    </div>
  );
}

function ReportSyncingState() {
  return (
    <div className="rounded-md border border-dashed bg-muted/20 p-4">
      <Stack gap="xs">
        <Text weight="medium">Report is still syncing</Text>
        <Text size="sm" variant="muted">
          The check is complete, but the report snapshot has not been stored in Comp yet.
        </Text>
      </Stack>
    </div>
  );
}

function ReadOnlyField({ label, value }: { label: string; value: string }) {
  return (
    <Stack gap="xs">
      <Text size="sm" variant="muted">
        {label}
      </Text>
      <Text>{value}</Text>
    </Stack>
  );
}

function formatLabel(value: string): string {
  return value.replace(/_/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
}
