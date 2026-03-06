'use client';

import { SelectAssignee } from '@/components/SelectAssignee';
import { RecentAuditLogs } from '@/components/RecentAuditLogs';
import { useAuditLogs } from '@/hooks/use-audit-logs';
import { useOrganizationMembers } from '@/hooks/use-organization-members';
import { downloadTaskEvidenceZip } from '@/lib/evidence-download';
import { usePermissions } from '@/hooks/use-permissions';
import { useActiveMember } from '@/utils/auth-client';
import { Button } from '@comp/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@comp/ui/dialog';
import {
  CommentEntityType,
  EvidenceAutomation,
  EvidenceAutomationRun,
  type Control,
  type Member,
  type Task,
  type TaskStatus,
  type User,
} from '@db';
import {
  Breadcrumb,
  HStack,
  PageLayout,
  Stack,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Text,
} from '@trycompai/design-system';
import { CheckCircle2, Clock, Download, RefreshCw, SendHorizontal, Trash2, XCircle } from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';
import { Comments } from '../../../../../../components/comments/Comments';
import { useTask } from '../hooks/use-task';
import { useTaskAutomations } from '../hooks/use-task-automations';
import { BrowserAutomations } from './BrowserAutomations';
import { FindingHistoryPanel } from './findings/FindingHistoryPanel';
import { FindingsList } from './findings/FindingsList';
import { TaskAutomations } from './TaskAutomations';
import { TaskAutomationStatusBadge } from './TaskAutomationStatusBadge';
import { TaskDeleteDialog } from './TaskDeleteDialog';
import { TaskIntegrationChecks } from './TaskIntegrationChecks';
import { TaskMainContent } from './TaskMainContent';
import { TaskPropertiesSidebar } from './TaskPropertiesSidebar';

type AutomationWithRuns = EvidenceAutomation & {
  runs: EvidenceAutomationRun[];
};

interface SingleTaskProps {
  initialTask: Task & { fileUrls?: string[]; controls?: Control[] };
  initialMembers?: (Member & { user: User })[];
  initialAutomations: AutomationWithRuns[];
  isWebAutomationsEnabled: boolean;
  isPlatformAdmin: boolean;
  evidenceApprovalEnabled?: boolean;
}

export function SingleTask({
  initialTask,
  initialMembers,
  initialAutomations,
  isWebAutomationsEnabled,
  isPlatformAdmin,
  evidenceApprovalEnabled = false,
}: SingleTaskProps) {
  const params = useParams();
  const orgId = params.orgId as string;
  const taskId = params.taskId as string;

  const {
    task,
    isLoading,
    mutate: mutateTask,
    updateTask,
    regenerateTask,
    submitForReview,
    approveTask: approveTaskFn,
    rejectTask: rejectTaskFn,
  } = useTask({
    initialData: initialTask,
  });
  const { automations } = useTaskAutomations({
    initialData: initialAutomations,
  });
  const { mutate: mutateActivity } = useAuditLogs({ entityType: 'task', entityId: taskId });

  const { data: activeMember } = useActiveMember();
  const { members } = useOrganizationMembers({
    initialData: initialMembers,
  });

  const { hasPermission } = usePermissions();

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isRegenerateConfirmOpen, setRegenerateConfirmOpen] = useState(false);
  const [selectedFindingIdForHistory, setSelectedFindingIdForHistory] = useState<string | null>(null);
  const [requestApprovalDialogOpen, setRequestApprovalDialogOpen] = useState(false);
  const [selectedApproverId, setSelectedApproverId] = useState<string | null>(null);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleValue, setTitleValue] = useState('');
  const [isEditingDescription, setIsEditingDescription] = useState(false);
  const [descriptionValue, setDescriptionValue] = useState('');

  if (!task || isLoading) {
    return null;
  }

  const canUpdateTask = hasPermission('task', 'update');
  const canDeleteTask = hasPermission('task', 'delete');

  const startEditingTitle = () => {
    if (!canUpdateTask) return;
    setTitleValue(task.title);
    setIsEditingTitle(true);
  };

  const saveTitleEdit = async () => {
    if (!titleValue.trim() || titleValue === task.title) {
      setIsEditingTitle(false);
      return;
    }
    try {
      await updateTask({ title: titleValue.trim() });
      toast.success('Title updated');
      setIsEditingTitle(false);
      mutateActivity();
    } catch {
      toast.error('Failed to update title');
    }
  };

  const startEditingDescription = () => {
    if (!canUpdateTask) return;
    setDescriptionValue(task.description || '');
    setIsEditingDescription(true);
  };

  const saveDescriptionEdit = async () => {
    if (descriptionValue === (task.description || '')) {
      setIsEditingDescription(false);
      return;
    }
    try {
      await updateTask({ description: descriptionValue.trim() });
      toast.success('Description updated');
      setIsEditingDescription(false);
      mutateActivity();
    } catch {
      toast.error('Failed to update description');
    }
  };

  const handleUpdateTask = async (
    updates: Partial<Pick<Task, 'status' | 'assigneeId' | 'approverId' | 'frequency' | 'department' | 'reviewDate'>>,
  ) => {
    try {
      await updateTask({
        status: updates.status,
        assigneeId: updates.assigneeId,
        frequency: updates.frequency,
        department: updates.department,
        reviewDate: updates.reviewDate ? String(updates.reviewDate) : undefined,
      });
      toast.success('Task updated');
      mutateActivity();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update task');
    }
  };

  const handleApproveTask = async () => {
    try {
      await approveTaskFn();
      toast.success('Task approved');
      mutateActivity();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to approve task');
    }
  };

  const handleRejectTask = async () => {
    try {
      await rejectTaskFn();
      toast.success('Task rejected');
      mutateActivity();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to reject task');
    }
  };

  const handleRequestApproval = () => {
    setSelectedApproverId(null);
    setRequestApprovalDialogOpen(true);
  };

  const handleSubmitForReview = async () => {
    if (!selectedApproverId) {
      toast.error('Please select an approver');
      return;
    }
    try {
      await submitForReview(selectedApproverId);
      toast.success('Task submitted for review');
      setRequestApprovalDialogOpen(false);
      mutateActivity();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to submit for review');
    }
  };

  const isAuditor = activeMember?.role?.includes('auditor') ?? false;
  const isAdminOrOwner =
    activeMember?.role?.includes('admin') || activeMember?.role?.includes('owner') || false;
  const isInReview = task.status === 'in_review';
  const isCurrentUserApprover =
    activeMember?.id && task.approverId && activeMember.id === task.approverId;
  const canApprove = evidenceApprovalEnabled && isInReview && isCurrentUserApprover;
  const canCancel =
    evidenceApprovalEnabled && isInReview && isAdminOrOwner && !isCurrentUserApprover;
  const approverMember =
    !task.approverId || !members ? null : members.find((m) => m.id === task.approverId);

  return (
    <PageLayout>
      <Breadcrumb
        items={[
          {
            label: 'Evidence',
            href: `/${orgId}/tasks`,
            props: { render: <Link href={`/${orgId}/tasks`} /> },
          },
          { label: task.title, isCurrent: true },
        ]}
      />

      {/* Title + Description */}
      <Stack gap="xs">
        <HStack justify="between" align="center">
          {isEditingTitle ? (
            <input
              value={titleValue}
              onChange={(e) => setTitleValue(e.target.value)}
              onBlur={saveTitleEdit}
              onKeyDown={(e) => {
                if (e.key === 'Enter') saveTitleEdit();
                if (e.key === 'Escape') setIsEditingTitle(false);
              }}
              className="text-2xl font-semibold tracking-tight bg-transparent border-b border-primary outline-none flex-1"
              autoFocus
            />
          ) : (
            <HStack gap="sm" align="center">
              <h1
                onClick={startEditingTitle}
                className="text-2xl font-semibold tracking-tight cursor-pointer rounded px-1 -mx-1 hover:bg-muted/50 transition-colors"
              >
                {task.title}
              </h1>
              <TaskAutomationStatusBadge status={task.automationStatus} />
            </HStack>
          )}
        </HStack>
        {isEditingDescription ? (
          <textarea
            value={descriptionValue}
            onChange={(e) => setDescriptionValue(e.target.value)}
            onBlur={saveDescriptionEdit}
            onKeyDown={(e) => {
              if (e.key === 'Escape') setIsEditingDescription(false);
            }}
            className="text-sm text-muted-foreground bg-transparent border-b border-primary outline-none resize-none w-full"
            rows={5}
            autoFocus
          />
        ) : (
          <Text
            size="sm"
            variant="muted"
            as="p"
            onClick={startEditingDescription}
            style={{ cursor: 'pointer' }}
          >
            {task.description || 'Add a description...'}
          </Text>
        )}
      </Stack>

      {/* Approval Banner */}
      {evidenceApprovalEnabled && isInReview && (
        <ApprovalBanner
          canApprove={!!canApprove}
          canCancel={canCancel}
          approverMember={approverMember}
          onApprove={handleApproveTask}
          onReject={handleRejectTask}
        />
      )}

      {/* Tabs */}
      <Tabs defaultValue="overview">
        <Stack gap="lg">
          <TabsList variant="underline">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            {task.automationStatus !== 'MANUAL' && <TabsTrigger value="automations">Automations</TabsTrigger>}
            <TabsTrigger value="findings">Findings</TabsTrigger>
            <TabsTrigger value="comments">Comments</TabsTrigger>
            <TabsTrigger value="activity">Activity</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <Stack gap="lg">
              <TaskPropertiesSidebar
                handleUpdateTask={handleUpdateTask}
                evidenceApprovalEnabled={evidenceApprovalEnabled}
                onRequestApproval={handleRequestApproval}
              />
              <TaskMainContent task={task} showComments={false} />
            </Stack>
          </TabsContent>

          <TabsContent value="automations">
            <Stack gap="lg">
              <TaskIntegrationChecks
                taskId={task.id}
                onTaskUpdated={() => mutateTask()}
                isManualTask={task.automationStatus === 'MANUAL'}
              />
              <TaskAutomations
                automations={automations || []}
                isManualTask={task.automationStatus === 'MANUAL'}
              />
              {isWebAutomationsEnabled && (
                <BrowserAutomations
                  taskId={task.id}
                  isManualTask={task.automationStatus === 'MANUAL'}
                />
              )}
            </Stack>
          </TabsContent>

          <TabsContent value="findings">
            <FindingsList
              taskId={task.id}
              isAuditor={isAuditor}
              isPlatformAdmin={isPlatformAdmin}
              isAdminOrOwner={isAdminOrOwner}
              onViewHistory={setSelectedFindingIdForHistory}
            />
            {selectedFindingIdForHistory && (
              <FindingHistoryPanel
                findingId={selectedFindingIdForHistory}
                onClose={() => setSelectedFindingIdForHistory(null)}
              />
            )}
          </TabsContent>

          <TabsContent value="comments">
            <Comments
              entityId={task.id}
              entityType={CommentEntityType.task}
              mentionResource="evidence"
              organizationId={orgId}
            />
          </TabsContent>

          <TabsContent value="activity">
            <TaskActivitySection taskId={taskId} />
          </TabsContent>

          <TabsContent value="settings">
            <Stack gap="lg">
              <HStack justify="between" align="center">
                <Stack gap="none">
                  <Text size="sm" weight="medium">Download Evidence</Text>
                  <Text size="xs" variant="muted">
                    Download all evidence for this task as a ZIP file
                  </Text>
                </Stack>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={async () => {
                    try {
                      await downloadTaskEvidenceZip({ taskId: task.id, taskTitle: task.title, includeJson: true });
                      toast.success('Evidence downloaded');
                    } catch {
                      toast.error('Failed to download evidence');
                    }
                  }}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download
                </Button>
              </HStack>

              <div className="border-t" />

              {canUpdateTask && (
                <>
                  <HStack justify="between" align="center">
                    <Stack gap="none">
                      <Text size="sm" weight="medium">Reset to Defaults</Text>
                      <Text size="xs" variant="muted">
                        Regenerate this evidence task using AI. All manual changes will be overwritten.
                      </Text>
                    </Stack>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setRegenerateConfirmOpen(true)}
                    >
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Regenerate
                    </Button>
                  </HStack>
                  <div className="border-t" />
                </>
              )}
              {canDeleteTask && (
                <HStack justify="between" align="center">
                  <Stack gap="none">
                    <Text size="sm" weight="medium">Delete Evidence</Text>
                    <Text size="xs" variant="muted">
                      Permanently delete this evidence task and all associated data
                    </Text>
                  </Stack>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setDeleteDialogOpen(true)}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </Button>
                </HStack>
              )}
            </Stack>
          </TabsContent>
        </Stack>
      </Tabs>

      {/* Dialogs */}
      <TaskDeleteDialog
        isOpen={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        task={task}
      />

      <Dialog open={isRegenerateConfirmOpen} onOpenChange={setRegenerateConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Regenerate Task</DialogTitle>
            <DialogDescription>
              This will regenerate the task content using AI. Any manual changes will be overwritten.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRegenerateConfirmOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={async () => {
                setRegenerateConfirmOpen(false);
                try {
                  await regenerateTask();
                  toast.success('Task regenerated');
                } catch (error) {
                  toast.error(error instanceof Error ? error.message : 'Failed to regenerate task');
                }
              }}
            >
              Regenerate
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={requestApprovalDialogOpen} onOpenChange={setRequestApprovalDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Request Approval</DialogTitle>
            <DialogDescription>
              Select an approver to review this task.
            </DialogDescription>
          </DialogHeader>
          <SelectAssignee
            assignees={members?.filter((m) => m.id !== activeMember?.id) ?? []}
            assigneeId={selectedApproverId ?? ''}
            onAssigneeChange={(id) => setSelectedApproverId(id)}
            withTitle={false}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRequestApprovalDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmitForReview} disabled={!selectedApproverId}>
              <SendHorizontal className="h-4 w-4 mr-2" />
              Submit for Review
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageLayout>
  );
}

function TaskActivitySection({ taskId }: { taskId: string }) {
  const { logs } = useAuditLogs({ entityType: 'task', entityId: taskId });
  return <RecentAuditLogs logs={logs} />;
}

function ApprovalBanner({
  canApprove,
  canCancel,
  approverMember,
  onApprove,
  onReject,
}: {
  canApprove: boolean;
  canCancel: boolean;
  approverMember: { user: { name: string | null; email: string } } | null | undefined;
  onApprove: () => void;
  onReject: () => void;
}) {
  if (canApprove) {
    return (
      <div className="rounded-lg border border-l-4 border-border border-l-orange-400 bg-orange-50 dark:bg-orange-950/20 p-4">
        <HStack justify="between" align="center">
          <HStack gap="sm" align="start">
            <CheckCircle2 className="h-5 w-5 text-orange-500 mt-0.5 shrink-0" />
            <Stack gap="none">
              <Text size="sm" weight="medium">Your approval is required</Text>
              <Text size="xs" variant="muted">Review the evidence and approve or reject.</Text>
            </Stack>
          </HStack>
          <HStack gap="sm">
            <Button variant="outline" size="sm" onClick={onReject}>
              <XCircle className="h-4 w-4 mr-2" />
              Reject
            </Button>
            <Button size="sm" onClick={onApprove}>
              <CheckCircle2 className="h-4 w-4 mr-2" />
              Approve
            </Button>
          </HStack>
        </HStack>
      </div>
    );
  }

  const approverName = approverMember
    ? approverMember.user.name || approverMember.user.email
    : 'the approver';

  return (
    <div className="rounded-lg border border-l-4 border-border border-l-muted-foreground/50 bg-background p-4">
      <HStack justify="between" align="center">
        <HStack gap="sm" align="start">
          <Clock className="h-5 w-5 text-muted-foreground mt-0.5 shrink-0" />
          <Stack gap="none">
            <Text size="sm" weight="medium">Pending approval</Text>
            <Text size="xs" variant="muted">Waiting for {approverName} to review.</Text>
          </Stack>
        </HStack>
        {canCancel && (
          <Button variant="outline" size="sm" onClick={onReject}>
            <XCircle className="h-4 w-4 mr-2" />
            Cancel
          </Button>
        )}
      </HStack>
    </div>
  );
}
