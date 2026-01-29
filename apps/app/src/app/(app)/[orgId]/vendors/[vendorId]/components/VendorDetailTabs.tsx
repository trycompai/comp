'use client';

import { Comments } from '@/components/comments/Comments';
import { VendorRiskAssessmentView } from '@/components/vendor-risk-assessment/VendorRiskAssessmentView';
import { CommentEntityType } from '@db';
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
import { useMemo, useState } from 'react';
import { VendorActions } from './VendorActions';
import { VendorPageClient } from './VendorPageClient';
import { TaskItems } from '@/components/task-items/TaskItems';
import type { VendorResponse } from '@/hooks/use-vendors';
import type { AssigneeOption } from '@/components/SelectAssignee';
import { normalizeVendor } from './vendor-utils';
import { useVendor } from '@/hooks/use-vendor';

interface VendorDetailTabsProps {
  vendorId: string;
  orgId: string;
  vendor: VendorResponse;
  assignees: AssigneeOption[];
  isViewingTask: boolean;
}

export function VendorDetailTabs({
  vendorId,
  orgId,
  vendor,
  assignees,
  isViewingTask,
}: VendorDetailTabsProps) {
  const [isEditSheetOpen, setIsEditSheetOpen] = useState(false);
  const { vendor: swrVendor, mutate: refreshVendor, updateVendor } = useVendor(vendorId, {
    organizationId: orgId,
    initialData: vendor,
  });
  const normalizedVendor = useMemo(
    () => normalizeVendor(swrVendor ?? vendor),
    [swrVendor, vendor],
  );

  const breadcrumbs = [
    { label: 'Vendors', href: `/${orgId}/vendors` },
    {
      label: normalizedVendor?.name ?? '',
      href: isViewingTask ? `/${orgId}/vendors/${vendorId}` : undefined,
      isCurrent: !isViewingTask,
    },
  ];

  const riskAssessmentData = normalizedVendor.riskAssessmentData;
  const riskAssessmentUpdatedAt = normalizedVendor.riskAssessmentUpdatedAt ?? null;

  return (
    <Tabs defaultValue="overview">
      <PageLayout
        header={
          <PageHeader
            title={normalizedVendor?.name ?? 'Vendor'}
            breadcrumbs={breadcrumbs}
            actions={
              <VendorActions
                vendorId={vendorId}
                orgId={orgId}
                onOpenEditSheet={() => setIsEditSheetOpen(true)}
              />
            }
            tabs={
              !isViewingTask && (
                <TabsList variant="underline">
                  <TabsTrigger value="overview">Overview</TabsTrigger>
                  <TabsTrigger value="risk-assessment">Risk Assessment</TabsTrigger>
                  <TabsTrigger value="tasks">Tasks</TabsTrigger>
                  <TabsTrigger value="comments">Comments</TabsTrigger>
                </TabsList>
              )
            }
          />
        }
      >
        <TabsContent value="overview">
          <VendorPageClient
            vendor={normalizedVendor}
            assignees={assignees}
            isViewingTask={isViewingTask}
            isEditSheetOpen={isEditSheetOpen}
            onEditSheetOpenChange={setIsEditSheetOpen}
            onVendorUpdated={refreshVendor}
            updateVendor={updateVendor}
          />
        </TabsContent>
        <TabsContent value="risk-assessment">
          <Stack gap="md">
            {riskAssessmentData ? (
              <VendorRiskAssessmentView
                source={{
                  title: 'Risk Assessment',
                  description: JSON.stringify(riskAssessmentData),
                  createdAt: (riskAssessmentUpdatedAt ?? normalizedVendor.updatedAt).toISOString(),
                  entityType: 'vendor',
                  createdByName: null,
                  createdByEmail: null,
                }}
              />
            ) : (
              <div className="rounded-lg border border-border bg-card p-8 text-center">
                <Text variant="muted" size="sm">
                  {normalizedVendor.status === 'in_progress'
                    ? 'Risk assessment is being generated. Please check back soon.'
                    : 'No risk assessment found yet.'}
                </Text>
              </div>
            )}
          </Stack>
        </TabsContent>
        {!isViewingTask && (
          <TabsContent value="tasks">
            <TaskItems entityId={vendorId} entityType="vendor" organizationId={orgId} />
          </TabsContent>
        )}
        {!isViewingTask && (
          <TabsContent value="comments">
            <Comments entityId={vendorId} entityType={CommentEntityType.vendor} organizationId={orgId} />
          </TabsContent>
        )}
      </PageLayout>
    </Tabs>
  );
}
