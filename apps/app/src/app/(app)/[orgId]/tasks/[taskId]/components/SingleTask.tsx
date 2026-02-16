'use client';

import { regenerateTaskAction } from '@/actions/tasks/regenerate-task-action';
import { SelectAssignee } from '@/components/SelectAssignee';
import { useOrganizationMembers } from '@/hooks/use-organization-members';
import { apiClient } from '@/lib/api-client';
import { downloadTaskEvidenceZip } from '@/lib/evidence-download';
import { useActiveMember } from '@/utils/auth-client';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbSeparator,
} from '@comp/ui/breadcrumb';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@trycompai/design-system';
import { CheckCircle2, ChevronRight, Clock, Download, RefreshCw, SendHorizontal, Trash2, XCircle } from 'lucide-react';
import { useAction } from 'next-safe-action/hooks';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';
import { Comments } from '../../../../../../components/comments/Comments';
import { useTask } from '../hooks/use-task';
import { useTaskActivity } from '../hooks/use-task-activity';
import { useTaskAutomations } from '../hooks/use-task-automations';
import { BrowserAutomations } from './BrowserAutomations';
import { FindingHistoryPanel } from './findings/FindingHistoryPanel';
import { FindingsList } from './findings/FindingsList';
import { TaskAutomations } from './TaskAutomations';
import { TaskAutomationStatusBadge } from './TaskAutomationStatusBadge';
import { TaskDeleteDialog } from './TaskDeleteDialog';
import { TaskIntegrationChecks } from './TaskIntegrationChecks';
import { TaskMainContent } from './TaskMainContent';
import { TaskActivityFull } from './TaskActivity';
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
  initialAutomations,
  isWebAutomationsEnabled,
  isPlatformAdmin,
  evidenceApprovalEnabled = false,
}: SingleTaskProps) {
  const params = useParams();
  const orgId = params.orgId as string;

  const {
    task,
    isLoading,
    mutate: mutateTask,
  } = useTask({
    initialData: initialTask,
  });
  const { automations } = useTaskAutomations({
    initialData: initialAutomations,
  });
  const { mutate: mutateActivity } = useTaskActivity();

  const { data: activeMember } = useActiveMember();
  const { members } = useOrganizationMembers();

  const memberRoles = activeMember?.role?.split(',').map((r: string) => r.trim()) || [];
  const isAuditor = memberRoles.includes('auditor');
  const isAdminOrOwner = memberRoles.includes('admin') || memberRoles.includes('owner');

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isRegenerateConfirmOpen, setRegenerateConfirmOpen] = useState(false);
  const [selectedFindingIdForHistory, setSelectedFindingIdForHistory] = useState<string | null>(
    null,
  );

  // Approval dialog state
  const [isApprovalDialogOpen, setApprovalDialogOpen] = useState(false);
  const [reviewApproverId, setReviewApproverId] = useState<string | null>(null);
  const [isSubmittingForReview, setIsSubmittingForReview] = useState(false);

  const regenerate = useAction(regenerateTaskAction, {
    onSuccess: () => {
      toast.success('Task updated with latest template content.');
    },
    onError: (error) => {
      toast.error(error.error?.serverError || 'Failed to regenerate task');
    },
  });

  const handleRequestApproval = () => {
    // Pre-populate with existing approver if one is already assigned
    setReviewApproverId(task?.approverId ?? null);
    setApprovalDialogOpen(true);
  };

  const handleSubmitForReview = async () => {
    if (!task || !orgId || !reviewApproverId) return;
    setIsSubmittingForReview(true);
    try {
      const response = await apiClient.post<Task>(
        `/v1/tasks/${task.id}/submit-for-review`,
        { approverId: reviewApproverId },
        orgId,
      );
      if (response.error) {
        throw new Error(response.error);
      }
      toast.success('Task submitted for approval');
      setApprovalDialogOpen(false);
      setReviewApproverId(null);
      await Promise.all([mutateTask(), mutateActivity()]);
    } catch (error) {
      console.error('Failed to submit for review:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to submit for review');
    } finally {
      setIsSubmittingForReview(false);
    }
  };

  const handleApproveTask = async () => {
    if (!task || !orgId) return;
    try {
      const response = await apiClient.post<Task>(
        `/v1/tasks/${task.id}/approve`,
        {},
        orgId,
      );
      if (response.error) {
        throw new Error(response.error);
      }
      toast.success('Task approved successfully');
      await Promise.all([mutateTask(), mutateActivity()]);
    } catch (error) {
      console.error('Failed to approve task:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to approve task');
    }
  };

  const handleRejectTask = async () => {
    if (!task || !orgId) return;
    try {
      const response = await apiClient.post<Task>(
        `/v1/tasks/${task.id}/reject`,
        {},
        orgId,
      );
      if (response.error) {
        throw new Error(response.error);
      }
      toast.success('Task review rejected');
      await Promise.all([mutateTask(), mutateActivity()]);
    } catch (error) {
      console.error('Failed to reject task:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to reject task');
    }
  };

  const handleUpdateTask = async (
    data: Partial<Pick<Task, 'status' | 'assigneeId' | 'approverId' | 'frequency' | 'department' | 'reviewDate'>>,
  ) => {
    if (!task || !orgId) return;

    const updatePayload: {
      status?: TaskStatus;
      assigneeId?: string | null;
      approverId?: string | null;
      frequency?: string | null;
      department?: string | null;
      reviewDate?: string | null;
    } = {};

    if (data.status !== undefined) {
      updatePayload.status = data.status;
    }
    if (data.department !== undefined) {
      updatePayload.department = data.department ?? null;
    }
    if (data.assigneeId !== undefined) {
      updatePayload.assigneeId = data.assigneeId;
    }
    if (data.approverId !== undefined) {
      updatePayload.approverId = data.approverId ?? null;
    }
    if (Object.prototype.hasOwnProperty.call(data, 'frequency')) {
      updatePayload.frequency = data.frequency ?? null;
    }
    if (data.reviewDate !== undefined) {
      updatePayload.reviewDate =
        data.reviewDate instanceof Date
          ? data.reviewDate.toISOString()
          : data.reviewDate
            ? String(data.reviewDate)
            : null;
    }

    if (Object.keys(updatePayload).length > 0) {
      try {
        const response = await apiClient.patch<Task>(`/v1/tasks/${task.id}`, updatePayload, orgId);

        if (response.error) {
          throw new Error(response.error);
        }

        await mutateTask();
      } catch (error) {
        console.error('Failed to update task:', error);
        toast.error(error instanceof Error ? error.message : 'Failed to update task');
      }
    }
  };

  if (!task || isLoading) {
    return null;
  }

  // Approval state
  const isInReview = task.status === 'in_review';
  const isCurrentUserApprover =
    activeMember?.id && task.approverId && activeMember.id === task.approverId;
  const canApprove = evidenceApprovalEnabled && isInReview && isCurrentUserApprover;
  const isCurrentUserAssignee =
    activeMember?.id && task.assigneeId && activeMember.id === task.assigneeId;
  const canCancel =
    evidenceApprovalEnabled && isInReview && isAdminOrOwner && !isCurrentUserApprover;

  // Find the approver member for the banner
  const approverMember =
    !task.approverId || !members ? null : members.find((m) => m.id === task.approverId);

  return (
    <div className="mx-auto max-w-7xl px-6 animate-in fade-in slide-in-from-bottom-4 duration-500 py-6">
      {/* Breadcrumb */}
      <div className="mb-5">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link
                  href={`/${orgId}/tasks`}
                  className="text-muted-foreground hover:text-foreground text-sm"
                >
                  Tasks
                </Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator>
              <ChevronRight className="h-4 w-4" />
            </BreadcrumbSeparator>
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <span className="text-foreground font-medium text-sm">{task.title}</span>
              </BreadcrumbLink>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </div>

      <Tabs defaultValue="overview">
        <TabsList variant="underline">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <div className="mt-6">
          {/* Approval Banner */}
          {evidenceApprovalEnabled && isInReview && (
            <div className="mb-6">
              {canApprove ? (
                <div className="rounded-lg border border-l-4 border-border border-l-orange-400 bg-orange-50 dark:bg-orange-950/20 p-4">
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="h-5 w-5 text-orange-500 mt-0.5 shrink-0" />
                    <div className="flex-1">
                      <p className="text-sm font-medium">Your approval is required</p>
                      <p className="text-sm text-muted-foreground">
                        Review the evidence for this task and approve or reject it.
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm" className="cursor-pointer" onClick={handleRejectTask}>
                        <XCircle className="h-4 w-4 mr-2" />
                        Reject
                      </Button>
                      <Button size="sm" className="cursor-pointer dark:text-white" onClick={handleApproveTask}>
                        <CheckCircle2 className="h-4 w-4 mr-2" />
                        Approve
                      </Button>
                    </div>
                  </div>
                </div>
              ) : canCancel ? (
                <div className="rounded-lg border border-l-4 border-border border-l-orange-400 bg-orange-50 dark:bg-orange-950/20 p-4">
                  <div className="flex items-start gap-3">
                    <Clock className="h-5 w-5 text-orange-500 mt-0.5 shrink-0" />
                    <div className="flex-1">
                      <p className="text-sm font-medium">Pending approval</p>
                      <p className="text-sm text-muted-foreground">
                        Waiting for {approverMember ? `${approverMember.user.name || approverMember.user.email}` : 'the approver'} to review and approve this task.
                      </p>
                    </div>
                    <Button variant="outline" size="sm" className="cursor-pointer" onClick={handleRejectTask}>
                      <XCircle className="h-4 w-4 mr-2" />
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="rounded-lg border border-l-4 border-border border-l-muted-foreground/50 bg-background p-4">
                  <div className="flex items-start gap-3">
                    <Clock className="h-5 w-5 text-muted-foreground mt-0.5 shrink-0" />
                    <div>
                      <p className="text-sm font-medium">Pending approval</p>
                      <p className="text-sm text-muted-foreground">
                        Waiting for {approverMember ? `${approverMember.user.name || approverMember.user.email}` : 'the approver'} to review and approve this task.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column */}
            <div className="lg:col-span-2 min-w-0 space-y-6">
              {/* Header Section */}
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <h1 className="text-2xl font-semibold tracking-tight text-foreground">
                      {task.title}
                    </h1>
                    <TaskAutomationStatusBadge status={task.automationStatus} />
                  </div>
                  {task.description && (
                    <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap break-words">
                      {task.description}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={async () => {
                      try {
                        await downloadTaskEvidenceZip({
                          taskId: task.id,
                          taskTitle: task.title,
                          organizationId: orgId,
                          includeJson: true,
                        });
                        toast.success('Task evidence downloaded');
                      } catch (err) {
                        toast.error('Failed to download evidence');
                      }
                    }}
                    className="h-8 w-8 text-muted-foreground hover:text-foreground"
                    title="Download task evidence"
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setRegenerateConfirmOpen(true)}
                    className="h-8 w-8 text-muted-foreground hover:text-foreground"
                    title="Regenerate task"
                  >
                    <RefreshCw className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setDeleteDialogOpen(true)}
                    className="h-8 w-8 text-muted-foreground hover:text-destructive"
                    title="Delete task"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              {/* Attachments */}
              <div className="space-y-3">
                <TaskMainContent task={task} showComments={false} />
              </div>

              {/* Integration Checks Section */}
              <TaskIntegrationChecks
                taskId={task.id}
                onTaskUpdated={() => mutateTask()}
                isManualTask={task.automationStatus === 'MANUAL'}
              />

              {/* Findings Section */}
              <FindingsList
                taskId={task.id}
                isAuditor={isAuditor}
                isPlatformAdmin={isPlatformAdmin}
                isAdminOrOwner={isAdminOrOwner}
                onViewHistory={setSelectedFindingIdForHistory}
              />

              {/* Browser Automations Section */}
              {isWebAutomationsEnabled && (
                <BrowserAutomations
                  taskId={task.id}
                  isManualTask={task.automationStatus === 'MANUAL'}
                />
              )}

              {/* Custom Automations Section */}
              <TaskAutomations
                automations={automations || []}
                isManualTask={task.automationStatus === 'MANUAL'}
              />

              {/* Comments Section */}
              <div>
                <Comments
                  entityId={task.id}
                  entityType={CommentEntityType.task}
                  organizationId={orgId}
                />
              </div>
            </div>

            {/* Right Column - Properties */}
            <div className="lg:col-span-1">
              <div className="pl-6 border-l border-border space-y-6">
                <TaskPropertiesSidebar
                  handleUpdateTask={handleUpdateTask}
                  evidenceApprovalEnabled={evidenceApprovalEnabled}
                  onRequestApproval={handleRequestApproval}
                />

                {/* Finding History Panel */}
                {selectedFindingIdForHistory && (
                  <FindingHistoryPanel
                    findingId={selectedFindingIdForHistory}
                    onClose={() => setSelectedFindingIdForHistory(null)}
                  />
                )}
              </div>
            </div>
          </div>
          </div>
        </TabsContent>

        <TabsContent value="activity">
          <div className="mt-6">
          <TaskActivityFull />
          </div>
        </TabsContent>
      </Tabs>

      {/* Delete Dialog */}
      <TaskDeleteDialog
        isOpen={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        task={task}
      />

      {/* Regenerate Confirmation Dialog */}
      <Dialog open={isRegenerateConfirmOpen} onOpenChange={setRegenerateConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Regenerate Task</DialogTitle>
            <DialogDescription>
              This will update the task title, description, and automation status with the latest
              content from the framework template. The current content will be replaced. Continue?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRegenerateConfirmOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                regenerate.execute({ taskId: task.id });
                setRegenerateConfirmOpen(false);
              }}
              disabled={regenerate.status === 'executing'}
            >
              {regenerate.status === 'executing' ? 'Working…' : 'Confirm'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Approval Dialog - opens when user tries to set status to "done" */}
      <Dialog
        open={isApprovalDialogOpen}
        onOpenChange={(open) => {
          if (!open) {
            setApprovalDialogOpen(false);
            setReviewApproverId(null);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Select Approver</DialogTitle>
            <DialogDescription>
              Select an approver to review the evidence for this task.
              Once approved, the task will be marked as done.
            </DialogDescription>
          </DialogHeader>
          <div className="py-2">
            <SelectAssignee
              assignees={members ?? []}
              onAssigneeChange={(id) => setReviewApproverId(id)}
              assigneeId={reviewApproverId || ''}
              withTitle={false}
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setApprovalDialogOpen(false);
                setReviewApproverId(null);
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmitForReview}
              disabled={isSubmittingForReview || !reviewApproverId}
            >
              {isSubmittingForReview ? (
                'Submitting...'
              ) : (
                <>
                  <SendHorizontal className="h-4 w-4 mr-2" />
                  Submit for Approval
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
