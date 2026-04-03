'use client';

import type { Control, Member, Policy, PolicyVersion, User } from '@db';
import type { JSONContent } from '@tiptap/react';
import { Stack, Tabs, TabsContent, TabsList, TabsTrigger } from '@trycompai/design-system';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { usePermissions } from '@/hooks/use-permissions';
import { Comments } from '../../../../../../components/comments/Comments';
import type { AuditLogWithRelations } from '@/hooks/use-audit-logs';
import { PolicyContentManager } from '../editor/components/PolicyDetails';
import { useAuditLogs } from '../hooks/useAuditLogs';
import { usePolicy } from '../hooks/usePolicy';
import { usePolicyVersions } from '../hooks/usePolicyVersions';
import { PolicyAlerts } from './PolicyAlerts';
import { PolicyArchiveSheet } from './PolicyArchiveSheet';
import { PolicyControlMappings } from './PolicyControlMappings';
import { PolicyDeleteDialog } from './PolicyDeleteDialog';
import { PolicyOverviewSheet } from './PolicyOverviewSheet';
import { PolicySettingsCard } from './PolicySettingsCard';
import { PolicyVersionsTab } from './PolicyVersionsTab';
import { RecentAuditLogs } from './RecentAuditLogs';

type PolicyVersionWithPublisher = PolicyVersion & {
  publishedBy: (Member & { user: User }) | null;
};

/**
 * Normalizes policy content from the database into a clean JSONContent[].
 * Handles two known storage patterns:
 *  - { set: [...] } wrapper from a previous createMany bug
 *  - [{type:"doc", content:[...]}] where a full doc was stored as an array element
 */
function sanitizePolicyContent(raw: unknown): JSONContent[] {
  if (!raw) return [];

  let arr: unknown[] = Array.isArray(raw) ? raw : [raw];

  if (arr.length === 1 && arr[0] && typeof arr[0] === 'object' && !Array.isArray(arr[0])) {
    const first = arr[0] as Record<string, unknown>;

    // Unwrap { set: [...] } wrapper
    if (Array.isArray(first.set)) {
      arr = first.set;
    }
    // Unwrap [{type:"doc", content:[...]}] — extract the doc's children
    else if (first.type === 'doc' && Array.isArray(first.content)) {
      arr = first.content;
    }
  }

  return arr as JSONContent[];
}

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
  versions: initialVersions,
  showAiAssistant,
}: PolicyPageTabsProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { hasPermission } = usePermissions();

  // Use SWR for policy data with initial data from server
  const { policy, mutate } = usePolicy({
    policyId,
    organizationId,
    initialData: initialPolicy,
  });

  // Use SWR for versions data with initial data from server
  const { versions, mutate: mutateVersions } = usePolicyVersions({
    policyId,
    organizationId,
    initialData: initialVersions,
  });

  // Use SWR for audit logs with initial data from server
  const { logs: auditLogs, mutate: mutateAuditLogs } = useAuditLogs({
    entityType: 'policy',
    entityId: policyId,
    initialData: logs,
  });

  // Combined mutate function to refresh policy, versions, and audit logs
  const mutateAll = async () => {
    await Promise.all([mutate(), mutateVersions(), mutateAuditLogs()]);
  };

  // Update a specific version's content in the cache (optimistic update)
  const updateVersionContent = (versionId: string, newContent: JSONContent[]) => {
    mutateVersions(
      (currentVersions) => {
        if (!currentVersions || !Array.isArray(currentVersions)) return currentVersions;
        return currentVersions.map((v) =>
          v.id === versionId ? { ...v, content: newContent } : v
        );
      },
      false // Don't revalidate - this is an optimistic update
    );
  };

  const hasDraftChanges = useMemo(() => {
    if (!policy) return false;
    const draftContent = policy.draftContent ?? [];
    const publishedContent = policy.content ?? [];
    return JSON.stringify(draftContent) !== JSON.stringify(publishedContent);
  }, [policy]);

  // Derive isPendingApproval from current policy data
  const isPendingApproval = policy ? !!policy.approverId : initialIsPendingApproval;

  const isDeleteDialogOpen = searchParams.get('delete-policy') === 'true';
  const tabFromUrl = searchParams.get('tab') || 'overview';
  const versionIdFromUrl = searchParams.get('versionId');
  const [activeTab, setActiveTab] = useState(tabFromUrl);

  // Sync activeTab with URL param
  useEffect(() => {
    setActiveTab(tabFromUrl);
  }, [tabFromUrl]);

  const handleTabChange = (value: string) => {
    setActiveTab(value);
    // Refresh audit logs when switching to activity tab
    if (value === 'activity') {
      mutateAuditLogs();
    }
    const params = new URLSearchParams(searchParams.toString());
    if (value === 'overview') {
      params.delete('tab');
      params.delete('versionId');
    } else {
      params.set('tab', value);
      // Keep versionId if switching to content tab
      if (value !== 'content') {
        params.delete('versionId');
      }
    }
    const query = params.toString();
    router.push(query ? `${pathname}?${query}` : pathname);
  };

  const handleCloseDeleteDialog = () => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete('delete-policy');
    const query = params.toString();
    router.push(query ? `${pathname}?${query}` : pathname);
  };

  return (
    <Stack gap="md">
      {/* Alerts always visible above tabs */}
      <PolicyAlerts policy={policy} isPendingApproval={isPendingApproval} onMutate={mutateAll} />

      <Tabs value={activeTab} onValueChange={handleTabChange}>
        <Stack gap="lg">
          <TabsList variant="underline">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="content">Content</TabsTrigger>
            <TabsTrigger value="versions">Versions</TabsTrigger>
            <TabsTrigger value="activity">Activity</TabsTrigger>
            <TabsTrigger value="comments">Comments</TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <Stack gap="md">
              <PolicySettingsCard
                policy={policy}
                assignees={assignees}
                isPendingApproval={isPendingApproval}
                onMutate={mutate}
              />
              <PolicyControlMappings
                mappedControls={mappedControls}
                allControls={allControls}
                isPendingApproval={isPendingApproval}
                onMutate={mutateAll}
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
                  const versionsArray = Array.isArray(versions) ? versions : [];
                  const currentVersion = versionsArray.find((v) => v.id === policy?.currentVersionId);
                  const raw = currentVersion?.content ?? policy?.content ?? [];
                  return sanitizePolicyContent(raw);
                })()
              }
              displayFormat={policy?.displayFormat}
              pdfUrl={
                // Use version PDF if available, otherwise fallback to policy PDF
                (Array.isArray(versions) ? versions : []).find((v) => v.id === policy?.currentVersionId)?.pdfUrl ?? policy?.pdfUrl
              }
              aiAssistantEnabled={showAiAssistant}
              hasUnpublishedChanges={hasDraftChanges}
              currentVersionNumber={
                (Array.isArray(versions) ? versions : []).find((v) => v.id === policy?.currentVersionId)?.version ?? null
              }
              currentVersionId={policy?.currentVersionId ?? null}
              pendingVersionId={policy?.pendingVersionId ?? null}
              versions={Array.isArray(versions) ? versions : []}
              policyStatus={policy?.status}
              lastPublishedAt={policy?.lastPublishedAt}
              assignees={assignees}
              initialVersionId={versionIdFromUrl || undefined}
              onMutate={mutateAll}
              onVersionContentChange={updateVersionContent}
            />
          </TabsContent>

          <TabsContent value="versions">
            {policy && (
              <PolicyVersionsTab
                policy={policy}
                versions={Array.isArray(versions) ? versions : []}
                assignees={assignees}
                isPendingApproval={isPendingApproval}
                onMutate={mutateAll}
              />
            )}
          </TabsContent>

          <TabsContent value="activity">
            <RecentAuditLogs logs={auditLogs} />
          </TabsContent>

          <TabsContent value="comments">
            <Comments entityId={policyId} entityType="policy" organizationId={organizationId} readOnly={!hasPermission('policy', 'update')} />
          </TabsContent>
        </Stack>
      </Tabs>

      {/* Sheets and dialogs that can be triggered from anywhere */}
      {policy && (
        <>
          <PolicyOverviewSheet policy={policy} />
          <PolicyArchiveSheet policy={policy} onMutate={mutateAll} />
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
