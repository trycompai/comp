'use client';

import type { Control, Member, Policy, User } from '@db';
import type { JSONContent } from '@tiptap/react';
import { Stack, Tabs, TabsContent, TabsList, TabsTrigger } from '@trycompai/design-system';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Comments } from '../../../../../../components/comments/Comments';
import type { AuditLogWithRelations } from '../data';
import { PolicyContentManager } from '../editor/components/PolicyDetails';
import { PolicyAlerts } from './PolicyAlerts';
import { PolicyArchiveSheet } from './PolicyArchiveSheet';
import { PolicyControlMappings } from './PolicyControlMappings';
import { PolicyDeleteDialog } from './PolicyDeleteDialog';
import { PolicyOverviewSheet } from './PolicyOverviewSheet';
import { PolicySettingsCard } from './PolicySettingsCard';
import { RecentAuditLogs } from './RecentAuditLogs';

interface PolicyPageTabsProps {
  policy: (Policy & { approver: (Member & { user: User }) | null }) | null;
  assignees: (Member & { user: User })[];
  mappedControls: Control[];
  allControls: Control[];
  isPendingApproval: boolean;
  policyId: string;
  organizationId: string;
  logs: AuditLogWithRelations[];
  showAiAssistant: boolean;
}

export function PolicyPageTabs({
  policy,
  assignees,
  mappedControls,
  allControls,
  isPendingApproval,
  policyId,
  organizationId,
  logs,
  showAiAssistant,
}: PolicyPageTabsProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

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
      <PolicyAlerts policy={policy} isPendingApproval={isPendingApproval} />

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
              policyContent={policy?.content ? (policy.content as JSONContent[]) : []}
              displayFormat={policy?.displayFormat}
              pdfUrl={policy?.pdfUrl}
              aiAssistantEnabled={showAiAssistant}
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
          <PolicyArchiveSheet policy={policy} />
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
