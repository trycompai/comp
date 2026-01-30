'use client';

import { isFailureRunStatus } from '@/app/(app)/[orgId]/cloud-tests/status';
import { VendorRiskAssessmentSkeleton } from '@/components/vendor-risk-assessment/VendorRiskAssessmentSkeleton';
import { VendorRiskAssessmentView } from '@/components/vendor-risk-assessment/VendorRiskAssessmentView';
import { useTaskItems } from '@/hooks/use-task-items';
import { useVendor, type VendorResponse } from '@/hooks/use-vendors';
import type { Member, User, Vendor } from '@db';
import type { Prisma } from '@prisma/client';
import { useRealtimeRun } from '@trigger.dev/react-hooks';
import {
  PageHeader,
  PageLayout,
  Stack,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Text,
} from '@trycompai/design-system';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { VendorActions } from './VendorActions';
import { VendorPageClient } from './VendorPageClient';
import { UpdateTitleAndDescriptionSheet } from './title-and-description/update-title-and-description-sheet';

// Vendor with risk assessment data merged from GlobalVendors
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
      ? {
          ...apiVendor.assignee,
          user: apiVendor.assignee.user as User | null,
        }
      : null,
  } as VendorWithRiskAssessment;
}

export function VendorDetailTabs({
  vendorId,
  orgId,
  vendor,
  assignees,
  isViewingTask,
}: VendorDetailTabsProps) {
  const [isEditSheetOpen, setIsEditSheetOpen] = useState(false);
  const [assessmentRunId, setAssessmentRunId] = useState<string | null>(null);
  const [assessmentToken, setAssessmentToken] = useState<string | null>(null);

  const { vendor: swrVendor, mutate: refreshVendor } = useVendor(vendorId, {
    organizationId: orgId,
  });

  const { data: taskItemsResponse, mutate: refreshTaskItems } = useTaskItems(
    vendorId,
    'vendor',
    1,
    50,
    'createdAt',
    'desc',
    {},
    {
      organizationId: orgId,
      refreshInterval: 0,
      revalidateOnFocus: true,
    },
  );

  // Track the assessment run in real-time
  const { run: assessmentRun } = useRealtimeRun(assessmentRunId ?? '', {
    accessToken: assessmentToken ?? undefined,
    enabled: Boolean(assessmentRunId && assessmentToken),
  });

  // Handle when assessment is triggered from VendorActions
  const handleAssessmentTriggered = useCallback((runId: string, token: string) => {
    setAssessmentRunId(runId);
    setAssessmentToken(token);
  }, []);

  // Check if the realtime run is still active
  const isRealtimeRunActive = useMemo(() => {
    if (!assessmentRun) return false;
    const activeStatuses = ['EXECUTING', 'QUEUED', 'PENDING', 'WAITING'];
    return activeStatuses.includes(assessmentRun.status);
  }, [assessmentRun]);

  // When realtime run completes or fails, refresh data and clear state
  useEffect(() => {
    if (!assessmentRun?.status) return;

    if (assessmentRun.status === 'COMPLETED') {
      void refreshVendor();
      void refreshTaskItems();
      setAssessmentRunId(null);
      setAssessmentToken(null);
    } else if (isFailureRunStatus(assessmentRun.status)) {
      // Handle failure states: FAILED, CRASHED, CANCELED, SYSTEM_FAILURE, etc.
      toast.error('Risk assessment failed. Please try again.');
      void refreshVendor();
      void refreshTaskItems();
      setAssessmentRunId(null);
      setAssessmentToken(null);
    }
  }, [assessmentRun?.status, refreshVendor, refreshTaskItems]);

  const resolvedVendor = useMemo(() => {
    if (swrVendor) {
      return normalizeVendor(swrVendor);
    }
    return vendor;
  }, [swrVendor, vendor]);

  // Check if there's an in-progress "Verify risk assessment" task (means task is still running)
  const isRiskAssessmentGenerating = useMemo(() => {
    const allTaskItems = taskItemsResponse?.data?.data ?? [];
    return allTaskItems.some(
      (t) => t.title === 'Verify risk assessment' && t.status === 'in_progress',
    );
  }, [taskItemsResponse]);

  // Poll more aggressively while generating (fallback if realtime doesn't work)
  useEffect(() => {
    if (!isRiskAssessmentGenerating) return;

    const interval = setInterval(() => {
      void refreshTaskItems();
      void refreshVendor();
    }, 3000);

    return () => clearInterval(interval);
  }, [isRiskAssessmentGenerating, refreshTaskItems, refreshVendor]);

  const breadcrumbs = [
    { label: 'Vendors', href: `/${orgId}/vendors` },
    {
      label: resolvedVendor?.name ?? '',
      href: isViewingTask ? `/${orgId}/vendors/${vendorId}` : undefined,
      isCurrent: !isViewingTask,
    },
  ];

  const riskAssessmentData = resolvedVendor.riskAssessmentData;
  const riskAssessmentUpdatedAt = resolvedVendor.riskAssessmentUpdatedAt ?? null;

  // Show skeleton if status is in_progress OR if the Trigger.dev task is still running
  const showSkeleton =
    resolvedVendor.status === 'in_progress' || isRiskAssessmentGenerating || isRealtimeRunActive;

  return (
    <Tabs defaultValue="overview">
      <PageLayout
        header={
          <PageHeader
            title={resolvedVendor?.name ?? 'Vendor'}
            breadcrumbs={breadcrumbs}
            actions={
              <VendorActions
                vendorId={vendorId}
                orgId={orgId}
                onOpenEditSheet={() => setIsEditSheetOpen(true)}
                onAssessmentTriggered={handleAssessmentTriggered}
              />
            }
            tabs={
              !isViewingTask && (
                <TabsList variant="underline">
                  <TabsTrigger value="overview">Overview</TabsTrigger>
                  <TabsTrigger value="risk-assessment">Risk Assessment</TabsTrigger>
                </TabsList>
              )
            }
          />
        }
      >
        <TabsContent value="overview">
          <VendorPageClient
            vendorId={vendorId}
            orgId={orgId}
            initialVendor={resolvedVendor}
            assignees={assignees}
            isViewingTask={isViewingTask}
          />
        </TabsContent>

        <TabsContent value="risk-assessment">
          <Stack gap="md">
            {riskAssessmentData ? (
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
            ) : (
              <div className="rounded-lg border border-border bg-card p-8 text-center">
                {showSkeleton ? (
                  <VendorRiskAssessmentSkeleton />
                ) : (
                  <Text variant="muted" size="sm">
                    No risk assessment found yet.
                  </Text>
                )}
              </div>
            )}
          </Stack>
        </TabsContent>
      </PageLayout>
      <UpdateTitleAndDescriptionSheet
        vendor={resolvedVendor}
        open={isEditSheetOpen}
        onOpenChange={setIsEditSheetOpen}
      />
    </Tabs>
  );
}
