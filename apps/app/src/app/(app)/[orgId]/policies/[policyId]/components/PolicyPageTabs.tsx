'use client';

import type { Control, Member, Policy, PolicyVersion, User } from '@db';
import type { JSONContent } from '@tiptap/react';
import { Stack, Tabs, TabsContent, TabsList, TabsTrigger } from '@trycompai/design-system';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useMemo } from 'react';
import { Comments } from '../../../../../../components/comments/Comments';
import type { AuditLogWithRelations } from '../data';
import { PolicyContentManager } from '../editor/components/PolicyDetails';
import { usePolicy } from '../hooks/usePolicy';
import { PolicyAlerts } from './PolicyAlerts';
import { PolicyArchiveSheet } from './PolicyArchiveSheet';
import { PolicyControlMappings } from './PolicyControlMappings';
import { PolicyDeleteDialog } from './PolicyDeleteDialog';
import { PolicyOverviewSheet } from './PolicyOverviewSheet';
import { PolicySettingsCard } from './PolicySettingsCard';
import { RecentAuditLogs } from './RecentAuditLogs';

type PolicyVersionWithPublisher = PolicyVersion & {
  publishedBy: (Member & { user: User }) | null;
};

interface PolicyPageTabsProps {
  policy: (Policy & { approver: (Member & { user: User }) | null }) | null;
  assignees: (Member & { user: User })[];
  mappedControls: Control[];
  allControls: Control[];
  isPendingApproval: boolean;
  policyId: string;
  organizationId: string;
  logs: AuditLogWithRelations[];
  versions: PolicyVersionWithPublisher[];
  showAiAssistant: boolean;
}

export function PolicyPageTabs({
  policy: initialPolicy,
  assignees,
  mappedControls,
  allControls,
  isPendingApproval: initialIsPendingApproval,
  policyId,
  organizationId,
  logs,
  versions,
  showAiAssistant,
}: PolicyPageTabsProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Use SWR for policy data with initial data from server
  const { policy, mutate } = usePolicy({
    policyId,
    organizationId,
    initialData: initialPolicy,
  });

  const hasDraftChanges = useMemo(() => {
    if (!policy) return false;
    const draftContent = policy.draftContent ?? [];
    const publishedContent = policy.content ?? [];
    return JSON.stringify(draftContent) !== JSON.stringify(publishedContent);
  }, [policy]);

  // Derive isPendingApproval from current policy data
  const isPendingApproval = policy ? !!policy.approverId : initialIsPendingApproval;

  const isDeleteDialogOpen = searchParams.get('delete-policy') === 'true';

  const handleCloseDeleteDialog = () => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete('delete-policy');
    const query = params.toString();
    router.push(query ? `${pathname}?${query}` : pathname);
  };

  return (
    <Stack gap="md">
      {/* Alerts always visible above tabs */}
      <PolicyAlerts policy={policy} isPendingApproval={isPendingApproval} onMutate={mutate} />

      <Tabs defaultValue="overview">
        <Stack gap="lg">
          <TabsList variant="underline">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="content">Content</TabsTrigger>
            <TabsTrigger value="activity">Activity</TabsTrigger>
            <TabsTrigger value="comments">Comments</TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <Stack gap="md">
              <PolicySettingsCard
                policy={policy}
                assignees={assignees}
                isPendingApproval={isPendingApproval}
                versions={versions}
                onMutate={mutate}
              />
              <PolicyControlMappings
                mappedControls={mappedControls}
                allControls={allControls}
                isPendingApproval={isPendingApproval}
              />
            </Stack>
          </TabsContent>

          <TabsContent value="content">
            <PolicyContentManager
              isPendingApproval={isPendingApproval}
              policyId={policyId}
              policyContent={
                // Priority: 1) Published version content, 2) legacy policy.content, 3) empty array
                (() => {
                  // Find the published version content
                  const currentVersion = versions.find((v) => v.id === policy?.currentVersionId);
                  if (currentVersion?.content) {
                    const versionContent = currentVersion.content as JSONContent[];
                    return Array.isArray(versionContent) ? versionContent : [versionContent];
                  }
                  // Fallback to legacy policy.content for backward compatibility
                  if (policy?.content) {
                    return policy.content as JSONContent[];
                  }
                  return [];
                })()
              }
              displayFormat={policy?.displayFormat}
              pdfUrl={
                // Use version PDF if available, otherwise fallback to policy PDF
                versions.find((v) => v.id === policy?.currentVersionId)?.pdfUrl ?? policy?.pdfUrl
              }
              aiAssistantEnabled={showAiAssistant}
              hasUnpublishedChanges={hasDraftChanges}
              currentVersionNumber={
                versions.find((v) => v.id === policy?.currentVersionId)?.version ?? null
              }
              currentVersionId={policy?.currentVersionId ?? null}
              pendingVersionId={policy?.pendingVersionId ?? null}
              versions={versions}
              onMutate={mutate}
            />
          </TabsContent>

          <TabsContent value="activity">
            <RecentAuditLogs logs={logs} />
          </TabsContent>

          <TabsContent value="comments">
            <Comments entityId={policyId} entityType="policy" organizationId={organizationId} />
          </TabsContent>
        </Stack>
      </Tabs>

      {/* Sheets and dialogs that can be triggered from anywhere */}
      {policy && (
        <>
          <PolicyOverviewSheet policy={policy} />
          <PolicyArchiveSheet policy={policy} onMutate={() => mutate()} />
          <PolicyDeleteDialog
            isOpen={isDeleteDialogOpen}
            onClose={handleCloseDeleteDialog}
            policy={policy}
          />
        </>
      )}
    </Stack>
  );
}
