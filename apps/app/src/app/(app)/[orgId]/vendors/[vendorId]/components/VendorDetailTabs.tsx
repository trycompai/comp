'use client';

import { isFailureRunStatus } from '@/app/(app)/[orgId]/cloud-tests/status';
import { VendorRiskAssessmentSkeleton } from '@/components/vendor-risk-assessment/VendorRiskAssessmentSkeleton';
import { VendorRiskAssessmentView } from '@/components/vendor-risk-assessment/VendorRiskAssessmentView';
import { VendorNewsLoadingPlaceholder } from '@/components/vendor-risk-assessment/VendorNewsLoadingPlaceholder';
import { parseVendorRiskAssessmentDescription } from '@/components/vendor-risk-assessment/parse-vendor-risk-assessment-description';
import { Comments } from '@/components/comments/Comments';
import { RecentAuditLogs } from '@/components/RecentAuditLogs';
import { usePaginatedAuditLogs } from '@/hooks/use-audit-logs';
import { TaskItems } from '@/components/task-items/TaskItems';
import { useTaskItems, useTaskItemActions } from '@/hooks/use-task-items';
import { useVendor, useVendorActions, type VendorResponse } from '@/hooks/use-vendors';
import { usePermissions } from '@/hooks/use-permissions';
import { SecondaryFields } from './secondary-fields/secondary-fields';
import { VendorResearchBadges, VendorResearchLinks } from './VendorResearchSection';
import { VendorResearchFeed } from './VendorResearchFeed';
import { VendorInherentRiskChart } from './VendorInherentRiskChart';
import { VendorResidualRiskChart } from './VendorResidualRiskChart';
import { ResidualAcceptanceCard } from '@/components/risks/acceptance/ResidualAcceptanceCard';
import { TreatmentPlanTab } from '@/components/risks/treatment-plan/TreatmentPlanTab';
import type { Member, RiskTreatmentType, User, Vendor } from '@db';
import { CommentEntityType } from '@db';
import type { Prisma } from '@db';
import { useRealtimeRun } from '@trigger.dev/react-hooks';
import { AnimatePresence, motion } from 'motion/react';
import {
  Breadcrumb,
  Button,
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
import { useQueryState } from 'nuqs';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

type VendorWithRiskAssessment = Vendor & {
  assignee: { user: User | null } | null;
  riskAssessmentData?: Prisma.InputJsonValue | null;
  riskAssessmentVersion?: string | null;
  riskAssessmentUpdatedAt?: Date | null;
};

interface VendorDetailTabsProps {
  vendorId: string;
  orgId: string;
  vendor: VendorWithRiskAssessment;
  assignees: (Member & { user: User })[];
  isViewingTask: boolean;
}

function normalizeVendor(apiVendor: VendorResponse): VendorWithRiskAssessment {
  return {
    ...apiVendor,
    createdAt: new Date(apiVendor.createdAt),
    updatedAt: new Date(apiVendor.updatedAt),
    riskAssessmentUpdatedAt: apiVendor.riskAssessmentUpdatedAt
      ? new Date(apiVendor.riskAssessmentUpdatedAt)
      : null,
    assignee: apiVendor.assignee
      ? { ...apiVendor.assignee, user: apiVendor.assignee.user as User | null }
      : null,
  } as VendorWithRiskAssessment;
}

export function VendorDetailTabs({
  vendorId,
  orgId,
  vendor: initialVendor,
  assignees,
  isViewingTask,
}: VendorDetailTabsProps) {
  const searchParams = useSearchParams();
  const taskItemId = searchParams.get('taskItemId');

  const { vendor: swrVendor, mutate: refreshVendor } = useVendor(vendorId);
  const {
    updateVendor,
    triggerAssessment,
    regenerateMitigation,
    suggestVendorLinks,
    applyVendorLinks,
    fetchActiveVendorAutoLinkRun,
    discardVendorAutoLinkRun,
  } = useVendorActions();
  const { hasPermission } = usePermissions();
  const canUpdate = hasPermission('vendor', 'update');
  const canUpdateTask = hasPermission('task', 'update');
  const { updateTaskItem } = useTaskItemActions();

  const [assessmentRunId, setAssessmentRunId] = useState<string | null>(null);
  const [assessmentToken, setAssessmentToken] = useState<string | null>(null);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleValue, setTitleValue] = useState('');
  const [isEditingDescription, setIsEditingDescription] = useState(false);
  const [descriptionValue, setDescriptionValue] = useState('');
  const [isMitigationLoading, setIsMitigationLoading] = useState(false);
  const [regenRun, setRegenRun] = useState<{
    runId: string;
    publicAccessToken: string;
  } | null>(null);
  const [isAssessmentLoading, setIsAssessmentLoading] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);
  // URL-backed tab state — bookmarks the active tab in `?tab=...` so a
  // refresh keeps the same view. Conditional rendering below mounts only
  // the active panel, sidestepping base-ui's transition window where the
  // outgoing panel stays at full opacity during the incoming fade-in
  // (visible "both panels stacked" flash on tab switch).
  const [activeTab, setActiveTab] = useQueryState('tab', {
    defaultValue: 'overview',
  });

  const { data: taskItemsData, mutate: refreshTaskItems } = useTaskItems(
    vendorId, 'vendor', 1, 50, 'createdAt', 'desc', {},
    { refreshInterval: 0, revalidateOnFocus: true },
  );

  const selectedTaskTitle = useMemo(() => {
    if (!taskItemId || !taskItemsData?.data?.data) return null;
    return taskItemsData.data.data.find((t) => t.id === taskItemId)?.title || null;
  }, [taskItemId, taskItemsData]);

  const resolvedVendor = useMemo(() => {
    if (swrVendor) return normalizeVendor(swrVendor);
    return {
      ...initialVendor,
      createdAt: initialVendor.createdAt instanceof Date ? initialVendor.createdAt : new Date(initialVendor.createdAt),
      updatedAt: initialVendor.updatedAt instanceof Date ? initialVendor.updatedAt : new Date(initialVendor.updatedAt),
      riskAssessmentUpdatedAt: initialVendor.riskAssessmentUpdatedAt
        ? initialVendor.riskAssessmentUpdatedAt instanceof Date
          ? initialVendor.riskAssessmentUpdatedAt
          : new Date(initialVendor.riskAssessmentUpdatedAt)
        : null,
    } as VendorWithRiskAssessment;
  }, [swrVendor, initialVendor]);

  // Realtime run tracking
  const { run: assessmentRun } = useRealtimeRun(assessmentRunId ?? '', {
    accessToken: assessmentToken ?? undefined,
    enabled: Boolean(assessmentRunId && assessmentToken),
  });

  const handleAssessmentTriggered = useCallback((runId: string, token: string) => {
    setAssessmentRunId(runId);
    setAssessmentToken(token);
  }, []);

  const isRealtimeRunActive = useMemo(() => {
    if (!assessmentRun) return false;
    return ['EXECUTING', 'QUEUED', 'PENDING', 'WAITING'].includes(assessmentRun.status);
  }, [assessmentRun]);

  // Extract research progress from trigger.dev run metadata
  const researchMetadata = useMemo(() => {
    if (!assessmentRun?.metadata) return null;
    const meta = assessmentRun.metadata as Record<string, unknown>;
    type MessageType = 'searching' | 'found' | 'analyzing' | 'error';
    const validTypes = new Set<string>(['searching', 'found', 'analyzing', 'error']);
    const rawMessages = (meta.messages as Array<{ text: string; type: string; timestamp: number }>) ?? [];
    return {
      phase: (meta.phase as string) ?? 'starting',
      messages: rawMessages.map((m) => ({
        ...m,
        type: (validTypes.has(m.type) ? m.type : 'analyzing') as MessageType,
      })),
      coreReady: (meta.coreReady as boolean) ?? false,
      newsReady: (meta.newsReady as boolean) ?? false,
    };
  }, [assessmentRun?.metadata]);

  // Trigger SWR refetch when core data or news data becomes ready
  useEffect(() => {
    if (researchMetadata?.coreReady) {
      setIsRegenerating(false);
      void refreshVendor();
    }
  }, [researchMetadata?.coreReady, refreshVendor]);

  useEffect(() => {
    if (researchMetadata?.newsReady) {
      void refreshVendor();
    }
  }, [researchMetadata?.newsReady, refreshVendor]);

  useEffect(() => {
    if (!assessmentRun?.status) return;
    if (assessmentRun.status === 'COMPLETED') {
      void refreshVendor();
      void refreshTaskItems();
      setAssessmentRunId(null);
      setAssessmentToken(null);
      setIsRegenerating(false);
    } else if (isFailureRunStatus(assessmentRun.status)) {
      toast.error('Risk assessment failed. Please try again.');
      void refreshVendor();
      void refreshTaskItems();
      setAssessmentRunId(null);
      setAssessmentToken(null);
      setIsRegenerating(false);
    }
  }, [assessmentRun?.status, refreshVendor, refreshTaskItems]);

  const isRiskAssessmentGenerating = useMemo(() => {
    const items = taskItemsData?.data?.data ?? [];
    return items.some((t) => t.title === 'Verify risk assessment' && t.status === 'in_progress');
  }, [taskItemsData]);

  useEffect(() => {
    if (!isRiskAssessmentGenerating) return;
    const interval = setInterval(() => { void refreshTaskItems(); void refreshVendor(); }, 3000);
    return () => clearInterval(interval);
  }, [isRiskAssessmentGenerating, refreshTaskItems, refreshVendor]);

  // Title editing
  const startEditingTitle = () => {
    if (isViewingTask) {
      if (!canUpdateTask) return;
      setTitleValue(selectedTaskTitle || '');
    } else {
      if (!canUpdate) return;
      setTitleValue(resolvedVendor.name);
    }
    setIsEditingTitle(true);
  };

  const saveTitleEdit = async () => {
    const current = isViewingTask ? (selectedTaskTitle || '') : resolvedVendor.name;
    if (!titleValue.trim() || titleValue === current) { setIsEditingTitle(false); return; }
    try {
      if (isViewingTask && taskItemId) {
        await updateTaskItem(taskItemId, { title: titleValue.trim() });
        refreshTaskItems();
      } else {
        await updateVendor(vendorId, { name: titleValue.trim() });
        refreshVendor();
      }
      toast.success('Title updated');
      setIsEditingTitle(false);
    } catch {
      toast.error('Failed to update title');
    }
  };

  // Description editing
  const startEditingDescription = () => {
    if (!canUpdate) return;
    setDescriptionValue(resolvedVendor.description || '');
    setIsEditingDescription(true);
  };

  const saveDescriptionEdit = async () => {
    if (descriptionValue === (resolvedVendor.description || '')) { setIsEditingDescription(false); return; }
    try {
      await updateVendor(vendorId, { description: descriptionValue.trim() });
      toast.success('Description updated');
      setIsEditingDescription(false);
      refreshVendor();
    } catch {
      toast.error('Failed to update description');
    }
  };

  const handleRegenerateMitigation = async () => {
    setIsMitigationLoading(true);
    try {
      const handle = await regenerateMitigation(vendorId);
      setRegenRun(handle);
    } catch {
      toast.error('Failed to trigger mitigation regeneration');
      setIsMitigationLoading(false);
    }
  };

  const handleRegenSettled = useCallback(
    (result: { success: boolean; reason?: string }) => {
      setRegenRun(null);
      setIsMitigationLoading(false);
      if (result.success) {
        toast.success('Treatment plan regenerated.');
        void refreshVendor();
      } else {
        toast.error(result.reason ?? 'Failed to regenerate the treatment plan.');
      }
    },
    [refreshVendor],
  );

  const handleUpdateStrategy = async (strategy: RiskTreatmentType) => {
    await updateVendor(vendorId, { treatmentStrategy: strategy });
    refreshVendor();
  };

  const handleSuggest = async () => {
    return suggestVendorLinks(vendorId);
  };

  const handleApply = async (params: { taskIds: string[]; replace: boolean }) => {
    await applyVendorLinks(vendorId, params);
    await refreshVendor();
  };

  const handleUnlinkTask = async (taskId: string) => {
    try {
      const res = await fetch(`/api/vendors/${vendorId}/tasks/${taskId}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!res.ok) throw new Error('unlink failed');
      await refreshVendor();
    } catch {
      toast.error('Failed to unlink task');
    }
  };

  // Memoize so AutoLinkSuggestions' resume effect (which depends on the
  // callback identity) doesn't re-fire on every parent re-render.
  const handleResumeAutoLink = useCallback(
    () => fetchActiveVendorAutoLinkRun(vendorId),
    [fetchActiveVendorAutoLinkRun, vendorId],
  );

  const handleDiscardAutoLinkRun = useCallback(
    async () => {
      await discardVendorAutoLinkRun(vendorId);
    },
    [discardVendorAutoLinkRun, vendorId],
  );

  const handleUpdateDescription = async (description: string) => {
    await updateVendor(vendorId, { treatmentStrategyDescription: description });
    refreshVendor();
  };

  const handleRegenerateAssessment = async () => {
    setIsAssessmentLoading(true);
    toast.info('Regenerating vendor risk assessment...');
    try {
      const result = await triggerAssessment(vendorId);
      toast.success('Assessment regeneration triggered.');
      if (result.runId && result.publicAccessToken) {
        setIsRegenerating(true);
        void setActiveTab('risk-assessment');
        handleAssessmentTriggered(result.runId, result.publicAccessToken);
      }
      refreshVendor();
    } catch {
      toast.error('Failed to trigger risk assessment regeneration');
    } finally {
      setIsAssessmentLoading(false);
    }
  };

  const riskAssessmentData = resolvedVendor.riskAssessmentData;
  const riskAssessmentUpdatedAt = resolvedVendor.riskAssessmentUpdatedAt ?? null;
  const showSkeleton = resolvedVendor.status === 'in_progress' || isRiskAssessmentGenerating || isRealtimeRunActive;

  // Check if risk assessment data has news
  const hasNews = useMemo(() => {
    if (!riskAssessmentData) return false;
    const parsed = parseVendorRiskAssessmentDescription(
      typeof riskAssessmentData === 'string' ? riskAssessmentData : JSON.stringify(riskAssessmentData),
    );
    return (parsed?.news?.length ?? 0) > 0;
  }, [riskAssessmentData]);

  // Is the vendor currently being researched? (survives page refresh via DB status)
  const isVendorInProgress = resolvedVendor.status === 'in_progress';

  // Determine which phase to show in the risk assessment tab
  // Show feed when:
  //   1. User just clicked regenerate (immediate, no waiting for realtime), OR
  //   2. We have a live realtime run and are waiting for core data, OR
  //   3. The vendor is in_progress in DB (page was refreshed during research)
  const showResearchFeed =
    (isRegenerating && !researchMetadata?.coreReady) ||
    (isRealtimeRunActive && researchMetadata && !riskAssessmentData) ||
    (isVendorInProgress && !isRealtimeRunActive);
  const showNewsPlaceholder = isRealtimeRunActive && riskAssessmentData && !isRegenerating && !hasNews && researchMetadata && !researchMetadata.newsReady;

  return (
    <>
      <Breadcrumb
        items={
          isViewingTask && taskItemId
            ? [
                { label: 'Vendors', href: `/${orgId}/vendors`, props: { render: <Link href={`/${orgId}/vendors`} /> } },
                { label: resolvedVendor.name, href: `/${orgId}/vendors/${vendorId}`, props: { render: <Link href={`/${orgId}/vendors/${vendorId}`} /> } },
                { label: 'Tasks', href: `/${orgId}/vendors/${vendorId}?tab=tasks`, props: { render: <Link href={`/${orgId}/vendors/${vendorId}?tab=tasks`} /> } },
                { label: selectedTaskTitle || 'Task', isCurrent: true },
              ]
            : [
                { label: 'Vendors', href: `/${orgId}/vendors`, props: { render: <Link href={`/${orgId}/vendors`} /> } },
                { label: resolvedVendor.name, isCurrent: true },
              ]
        }
      />

      <Stack gap="xs">
        <div className="flex items-center gap-3 self-start">
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
              {isViewingTask ? (selectedTaskTitle || 'Task') : resolvedVendor.name}
            </h1>
          )}
          {!isViewingTask && !isRegenerating && !isVendorInProgress && (
            <VendorResearchBadges riskAssessmentData={resolvedVendor.riskAssessmentData} />
          )}
          {!isViewingTask && (isRegenerating || isVendorInProgress) && (
            <div className="inline-flex items-center gap-1.5 rounded-md border border-primary/20 bg-primary/5 px-2 py-0.5">
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-primary" />
              </span>
              <span className="text-[11px] font-medium text-primary">Researching</span>
            </div>
          )}
        </div>
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
                {resolvedVendor.description || (canUpdate ? 'Add a description...' : '')}
              </Text>
            )
          )}
        {!isViewingTask && !isRegenerating && !isVendorInProgress && (
          <VendorResearchLinks riskAssessmentData={resolvedVendor.riskAssessmentData} />
        )}
      </Stack>

      {isViewingTask ? (
        <TaskItems entityId={vendorId} entityType="vendor" />
      ) : (
        <Tabs value={activeTab} onValueChange={(next) => void setActiveTab(String(next))}>
          <Stack gap="lg">
            <TabsList variant="underline">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="treatment-plan">Treatment Plan</TabsTrigger>
              <TabsTrigger value="risk-matrix">Risk Matrix</TabsTrigger>
              <TabsTrigger value="risk-assessment">Risk Assessment</TabsTrigger>
              <TabsTrigger value="tasks">Tasks</TabsTrigger>
              <TabsTrigger value="comments">Comments</TabsTrigger>
              <TabsTrigger value="activity">Activity</TabsTrigger>
              <TabsTrigger value="settings">Settings</TabsTrigger>
            </TabsList>

            {activeTab === 'overview' && (
              <TabsContent value="overview">
                <SecondaryFields vendor={resolvedVendor} assignees={assignees} onUpdate={refreshVendor} />
              </TabsContent>
            )}

            {activeTab === 'treatment-plan' && (
            <TabsContent value="treatment-plan">
              <TreatmentPlanTab
                orgId={orgId}
                entity={{
                  id: resolvedVendor.id,
                  inherentLikelihood: resolvedVendor.inherentProbability,
                  inherentImpact: resolvedVendor.inherentImpact,
                  residualLikelihood: resolvedVendor.residualProbability,
                  residualImpact: resolvedVendor.residualImpact,
                  treatmentStrategy: resolvedVendor.treatmentStrategy,
                  treatmentStrategyDescription: resolvedVendor.treatmentStrategyDescription,
                  strategyDescriptions:
                    (resolvedVendor as { strategyDescriptions?: unknown })
                      .strategyDescriptions as
                      | Partial<Record<RiskTreatmentType, string>>
                      | null
                      | undefined ?? null,
                  tasks: swrVendor?.tasks ?? [],
                }}
                canUpdate={canUpdate}
                onUpdateStrategy={handleUpdateStrategy}
                onUpdateDescription={handleUpdateDescription}
                onRegenerate={handleRegenerateMitigation}
                regenerating={isMitigationLoading}
                onSuggest={handleSuggest}
                onApply={handleApply}
                // Gate the unlink affordance behind vendor:update so it
                // doesn't render for read-only users. The Next API route
                // also enforces this check server-side.
                onUnlinkTask={canUpdate ? handleUnlinkTask : undefined}
                onResumeAutoLink={handleResumeAutoLink}
                onDiscardAutoLinkRun={handleDiscardAutoLinkRun}
                regenRun={regenRun}
                onRegenSettled={handleRegenSettled}
              />
              <div className="mt-6">
                <ResidualAcceptanceCard
                  kind="vendor"
                  subjectId={resolvedVendor.id}
                  residualLikelihood={resolvedVendor.residualProbability}
                  residualImpact={resolvedVendor.residualImpact}
                  ownerId={resolvedVendor.assigneeId}
                  acceptorOptions={assignees.map((member) => ({
                    id: member.id,
                    name: member.user?.name ?? member.user?.email ?? 'Unknown',
                  }))}
                  canUpdate={canUpdate}
                />
              </div>
            </TabsContent>
            )}

            {activeTab === 'risk-matrix' && (
            <TabsContent value="risk-matrix">
              <Stack gap="lg">
                <VendorInherentRiskChart vendor={resolvedVendor} />
                <VendorResidualRiskChart vendor={resolvedVendor} />
              </Stack>
            </TabsContent>
            )}

            {activeTab === 'risk-assessment' && (
            <TabsContent value="risk-assessment">
              <Stack gap="md">
                <AnimatePresence mode="wait">
                  {showResearchFeed ? (
                    <motion.div
                      key="research-feed"
                      initial={{ opacity: 1 }}
                      exit={{ opacity: 0, height: 0, marginTop: 0 }}
                      transition={{ duration: 0.3, ease: 'easeInOut' }}
                    >
                      <VendorResearchFeed
                        messages={researchMetadata?.messages ?? []}
                        isActive={isRealtimeRunActive || isVendorInProgress}
                        vendorName={resolvedVendor.name}
                      />
                    </motion.div>
                  ) : riskAssessmentData ? (
                    <motion.div
                      key="assessment-data"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 0.4 }}
                    >
                      <VendorRiskAssessmentView
                        source={{
                          title: 'Risk Assessment',
                          description: JSON.stringify(riskAssessmentData),
                          createdAt: (riskAssessmentUpdatedAt ?? resolvedVendor.updatedAt).toISOString(),
                          entityType: 'vendor',
                          createdByName: null,
                          createdByEmail: null,
                        }}
                      />
                      {showNewsPlaceholder && <VendorNewsLoadingPlaceholder />}
                    </motion.div>
                  ) : (
                    <div className="rounded-lg border border-border bg-card p-8 text-center">
                      {showSkeleton ? (
                        <VendorRiskAssessmentSkeleton />
                      ) : (
                        <Text variant="muted" size="sm">No risk assessment found yet.</Text>
                      )}
                    </div>
                  )}
                </AnimatePresence>
              </Stack>
            </TabsContent>
            )}

            {activeTab === 'tasks' && (
              <TabsContent value="tasks">
                <TaskItems entityId={vendorId} entityType="vendor" />
              </TabsContent>
            )}

            {activeTab === 'comments' && (
              <TabsContent value="comments">
                <Comments entityId={vendorId} entityType={CommentEntityType.vendor} organizationId={orgId} />
              </TabsContent>
            )}

            {activeTab === 'activity' && (
              <TabsContent value="activity">
                <VendorActivitySection vendorId={vendorId} taskItemIds={taskItemsData?.data?.data?.map((t) => t.id) || []} />
              </TabsContent>
            )}

            {activeTab === 'settings' && (
            <TabsContent value="settings">
              <Stack gap="lg">
                {canUpdate && (
                  <HStack justify="between" align="center">
                    <Stack gap="none">
                      <Text size="sm" weight="medium">Regenerate Risk Assessment</Text>
                      <Text size="xs" variant="muted">
                        Generate or regenerate the AI risk assessment for this vendor
                      </Text>
                    </Stack>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleRegenerateAssessment}
                      disabled={isAssessmentLoading}
                      loading={isAssessmentLoading}
                    >
                      Regenerate Assessment
                    </Button>
                  </HStack>
                )}
              </Stack>
            </TabsContent>
            )}
          </Stack>
        </Tabs>
      )}
    </>
  );
}

function VendorActivitySection({ vendorId, taskItemIds }: { vendorId: string; taskItemIds: string[] }) {
  const entityIds = [vendorId, ...taskItemIds].join(',');
  const entityTypes = taskItemIds.length > 0 ? 'vendor,task' : 'vendor';
  const { logs, total, hasMore, loadMore, isLoadingMore } = usePaginatedAuditLogs({
    entityType: entityTypes,
    entityId: entityIds,
  });
  return (
    <RecentAuditLogs
      logs={logs}
      total={total}
      hasMore={hasMore}
      onLoadMore={loadMore}
      isLoadingMore={isLoadingMore}
    />
  );
}
