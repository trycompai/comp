'use client';

import { Comments } from '@/components/comments/Comments';
import { RecentAuditLogs } from '@/components/RecentAuditLogs';
import { InherentRiskChart } from '@/components/risks/charts/InherentRiskChart';
import { ResidualRiskChart } from '@/components/risks/charts/ResidualRiskChart';
import { RiskOverview } from '@/components/risks/risk-overview';
import { TreatmentPlanTab } from '@/components/risks/treatment-plan/TreatmentPlanTab';
import { TaskItems } from '@/components/task-items/TaskItems';
import { useAuditLogs } from '@/hooks/use-audit-logs';
import { useRisk, useRiskActions, type RiskLinkedTask, type RiskResponse } from '@/hooks/use-risks';
import { useTaskItems, useTaskItemActions } from '@/hooks/use-task-items';
import { usePermissions } from '@/hooks/use-permissions';
import { CommentEntityType } from '@db';
import type { Member, Risk, RiskTreatmentType, User } from '@db';
import {
  Breadcrumb,
  HStack,
  Stack,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Text,
} from '@trycompai/design-system';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useCallback, useMemo, useState } from 'react';
import { toast } from 'sonner';

type RiskWithAssignee = Risk & {
  assignee: { user: User } | null;
};

function normalizeRisk(apiRisk: RiskResponse): RiskWithAssignee {
  return {
    ...apiRisk,
    createdAt: new Date(apiRisk.createdAt),
    updatedAt: new Date(apiRisk.updatedAt),
    assignee: apiRisk.assignee
      ? {
          ...apiRisk.assignee,
          user: apiRisk.assignee.user as User,
        }
      : null,
  } as unknown as RiskWithAssignee;
}

interface RiskPageClientProps {
  riskId: string;
  orgId: string;
  initialRisk: RiskWithAssignee;
  assignees: (Member & { user: User })[];
  taskItemId: string | null;
}

export function RiskPageClient({
  riskId,
  orgId,
  initialRisk,
  assignees,
  taskItemId,
}: RiskPageClientProps) {
  const { risk: swrRisk, mutate: mutateRisk } = useRisk(riskId);
  const {
    updateRisk,
    regenerateMitigation,
    suggestRiskLinks,
    applyRiskLinks,
    fetchActiveRiskAutoLinkRun,
    discardRiskAutoLinkRun,
  } = useRiskActions();
  const { hasPermission } = usePermissions();
  const searchParams = useSearchParams();
  const defaultTab = searchParams.get('tab') || 'overview';
  const isViewingTask = Boolean(taskItemId);
  const canUpdate = hasPermission('risk', 'update');
  const canUpdateTask = hasPermission('task', 'update');
  const { data: taskItemsData, mutate: mutateTaskItems } = useTaskItems(riskId, 'risk', 1, 50);
  const { updateTaskItem } = useTaskItemActions();
  const selectedTaskTitle = useMemo(() => {
    if (!taskItemId || !taskItemsData?.data?.data) return null;
    const found = taskItemsData.data.data.find((t) => t.id === taskItemId);
    return found?.title || null;
  }, [taskItemId, taskItemsData]);

  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleValue, setTitleValue] = useState('');
  const [isEditingDescription, setIsEditingDescription] = useState(false);
  const [descriptionValue, setDescriptionValue] = useState('');
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [regenRun, setRegenRun] = useState<{
    runId: string;
    publicAccessToken: string;
  } | null>(null);

  const risk = useMemo(() => {
    if (swrRisk) return normalizeRisk(swrRisk);
    return initialRisk;
  }, [swrRisk, initialRisk]);

  const startEditingTitle = () => {
    if (isViewingTask) {
      if (!canUpdateTask) return;
      setTitleValue(selectedTaskTitle || '');
    } else {
      if (!canUpdate) return;
      setTitleValue(risk.title);
    }
    setIsEditingTitle(true);
  };

  const saveTitleEdit = async () => {
    const currentTitle = isViewingTask ? (selectedTaskTitle || '') : risk.title;
    if (!titleValue.trim() || titleValue === currentTitle) {
      setIsEditingTitle(false);
      return;
    }
    try {
      if (isViewingTask && taskItemId) {
        await updateTaskItem(taskItemId, { title: titleValue.trim() });
        mutateTaskItems();
      } else {
        await updateRisk(riskId, { title: titleValue.trim() });
        mutateRisk();
      }
      toast.success('Title updated');
      setIsEditingTitle(false);
    } catch {
      toast.error('Failed to update title');
    }
  };

  const startEditingDescription = () => {
    if (!canUpdate) return;
    setDescriptionValue(risk.description || '');
    setIsEditingDescription(true);
  };

  const saveDescriptionEdit = async () => {
    if (descriptionValue === (risk.description || '')) {
      setIsEditingDescription(false);
      return;
    }
    try {
      await updateRisk(riskId, { description: descriptionValue.trim() });
      toast.success('Description updated');
      setIsEditingDescription(false);
      mutateRisk();
    } catch {
      toast.error('Failed to update description');
    }
  };

  const handleUpdateStrategy = async (strategy: RiskTreatmentType) => {
    await updateRisk(riskId, { treatmentStrategy: strategy });
    mutateRisk();
  };

  const handleUpdateDescription = async (description: string) => {
    await updateRisk(riskId, { treatmentStrategyDescription: description });
    mutateRisk();
  };

  const handleRegenerateMitigation = async () => {
    setIsRegenerating(true);
    try {
      const handle = await regenerateMitigation(riskId);
      // Hand control to the realtime subscription in DescriptionEditor.
      // It calls back via onRegenSettled when the run terminates, at which
      // point we clear isRegenerating + refetch the risk for the new prose.
      setRegenRun(handle);
    } catch {
      toast.error('Failed to trigger mitigation regeneration');
      setIsRegenerating(false);
    }
  };

  const handleRegenSettled = useCallback(
    (result: { success: boolean; reason?: string }) => {
      setRegenRun(null);
      setIsRegenerating(false);
      if (result.success) {
        toast.success('Treatment plan regenerated.');
        void mutateRisk();
      } else {
        toast.error(result.reason ?? 'Failed to regenerate the treatment plan.');
      }
    },
    [mutateRisk],
  );

  const handleSuggest = async () => {
    return suggestRiskLinks(riskId);
  };

  const handleApply = async (params: { taskIds: string[]; replace: boolean }) => {
    await applyRiskLinks(riskId, params);
    await mutateRisk();
  };

  const handleUnlinkTask = async (taskId: string) => {
    try {
      const res = await fetch(`/api/risks/${riskId}/tasks/${taskId}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!res.ok) throw new Error('unlink failed');
      await mutateRisk();
    } catch {
      toast.error('Failed to unlink task');
    }
  };

  // Memoize so AutoLinkSuggestions' resume effect (which depends on the
  // callback identity) doesn't re-fire on every parent re-render.
  const handleResumeAutoLink = useCallback(
    () => fetchActiveRiskAutoLinkRun(riskId),
    [fetchActiveRiskAutoLinkRun, riskId],
  );

  const handleDiscardAutoLinkRun = useCallback(
    async () => {
      await discardRiskAutoLinkRun(riskId);
    },
    [discardRiskAutoLinkRun, riskId],
  );

  return (
    <>
      <Breadcrumb
        items={
          taskItemId
            ? [
                { label: 'Risks', href: `/${orgId}/risk`, props: { render: <Link href={`/${orgId}/risk`} /> } },
                { label: risk.title, href: `/${orgId}/risk/${riskId}`, props: { render: <Link href={`/${orgId}/risk/${riskId}`} /> } },
                { label: 'Tasks', href: `/${orgId}/risk/${riskId}?tab=tasks`, props: { render: <Link href={`/${orgId}/risk/${riskId}?tab=tasks`} /> } },
                { label: selectedTaskTitle || 'Task', isCurrent: true },
              ]
            : [
                { label: 'Risks', href: `/${orgId}/risk`, props: { render: <Link href={`/${orgId}/risk`} /> } },
                { label: risk.title, isCurrent: true },
              ]
        }
      />

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
            <h1
              onClick={(isViewingTask ? canUpdateTask : canUpdate) ? startEditingTitle : undefined}
              className={`text-2xl font-semibold tracking-tight ${(isViewingTask ? canUpdateTask : canUpdate) ? 'cursor-pointer rounded px-1 -mx-1 hover:bg-muted/50 transition-colors' : ''}`}
            >
              {taskItemId ? (selectedTaskTitle || 'Task') : risk.title}
            </h1>
          )}
        </HStack>
        {!isViewingTask && (
          isEditingDescription ? (
            <textarea
              value={descriptionValue}
              onChange={(e) => {
                setDescriptionValue(e.target.value);
                const el = e.target;
                el.style.height = 'auto';
                el.style.height = `${el.scrollHeight}px`;
              }}
              onFocus={(e) => {
                const el = e.target;
                el.style.height = 'auto';
                el.style.height = `${el.scrollHeight}px`;
              }}
              onBlur={saveDescriptionEdit}
              onKeyDown={(e) => {
                if (e.key === 'Escape') setIsEditingDescription(false);
              }}
              className="text-sm text-muted-foreground bg-transparent border-b border-primary outline-none resize-none overflow-hidden w-full"
              rows={1}
              autoFocus
            />
          ) : (
            <Text
              size="sm"
              variant="muted"
              as="p"
              onClick={startEditingDescription}
              style={canUpdate ? { cursor: 'pointer' } : undefined}
            >
              {risk.description || (canUpdate ? 'Add a description...' : '')}
            </Text>
          )
        )}
      </Stack>

      {isViewingTask ? (
        <TaskItems entityId={riskId} entityType="risk"  />
      ) : (
        <Tabs defaultValue={defaultTab}>
          <Stack gap="lg">
            <TabsList variant="underline">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="treatment-plan">Treatment Plan</TabsTrigger>
              <TabsTrigger value="risk-matrix">Risk Matrix</TabsTrigger>
              <TabsTrigger value="tasks">Tasks</TabsTrigger>
              <TabsTrigger value="comments">Comments</TabsTrigger>
              <TabsTrigger value="activity">Activity</TabsTrigger>
              <TabsTrigger value="settings">Settings</TabsTrigger>
            </TabsList>

            <TabsContent value="overview">
              <RiskOverview risk={risk} assignees={assignees} />
            </TabsContent>

            <TabsContent value="treatment-plan">
              <TreatmentPlanTab
                orgId={orgId}
                entity={{
                  id: risk.id,
                  inherentLikelihood: risk.likelihood,
                  inherentImpact: risk.impact,
                  residualLikelihood: risk.residualLikelihood,
                  residualImpact: risk.residualImpact,
                  treatmentStrategy: risk.treatmentStrategy,
                  treatmentStrategyDescription: risk.treatmentStrategyDescription,
                  strategyDescriptions:
                    (swrRisk as { strategyDescriptions?: unknown } | undefined)
                      ?.strategyDescriptions as
                      | Partial<Record<RiskTreatmentType, string>>
                      | null
                      | undefined ?? null,
                  // Fall through to the server-rendered initial risk so the
                  // Linked Work column doesn't blink empty between SSR and
                  // the first SWR resolution. (Cubic finding #28.)
                  tasks:
                    swrRisk?.tasks ??
                    (initialRisk as unknown as { tasks?: RiskLinkedTask[] })
                      .tasks ??
                    [],
                }}
                canUpdate={canUpdate}
                onUpdateStrategy={handleUpdateStrategy}
                onUpdateDescription={handleUpdateDescription}
                onRegenerate={handleRegenerateMitigation}
                regenerating={isRegenerating}
                onSuggest={handleSuggest}
                onApply={handleApply}
                // Gate the unlink affordance behind risk:update so the trash
                // button doesn't render for read-only users. The Next API
                // route enforces the same check server-side as defense in
                // depth. (Cubic finding on PR #2671.)
                onUnlinkTask={canUpdate ? handleUnlinkTask : undefined}
                onResumeAutoLink={handleResumeAutoLink}
                onDiscardAutoLinkRun={handleDiscardAutoLinkRun}
                regenRun={regenRun}
                onRegenSettled={handleRegenSettled}
              />
            </TabsContent>

            <TabsContent value="risk-matrix">
              <Stack gap="lg">
                <InherentRiskChart risk={risk} />
                <ResidualRiskChart risk={risk} />
              </Stack>
            </TabsContent>

            <TabsContent value="tasks">
              <TaskItems entityId={riskId} entityType="risk"  />
            </TabsContent>

            <TabsContent value="comments">
              <Comments entityId={riskId} entityType={CommentEntityType.risk} organizationId={orgId} />
            </TabsContent>

            <TabsContent value="activity">
              <RiskActivitySection riskId={riskId} taskItemIds={taskItemsData?.data?.data?.map((t) => t.id) || []} />
            </TabsContent>

            <TabsContent value="settings">
              <Text size="sm" variant="muted">No settings yet.</Text>
            </TabsContent>
          </Stack>
        </Tabs>
      )}
    </>
  );
}

function RiskActivitySection({ riskId, taskItemIds }: { riskId: string; taskItemIds: string[] }) {
  // Include both risk logs and task item logs in the activity feed
  const entityIds = [riskId, ...taskItemIds].join(',');
  const entityTypes = taskItemIds.length > 0 ? 'risk,task' : 'risk';
  const { logs } = useAuditLogs({ entityType: entityTypes, entityId: entityIds });
  return <RecentAuditLogs logs={logs} />;
}
