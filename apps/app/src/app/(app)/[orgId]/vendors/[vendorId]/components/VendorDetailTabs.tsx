'use client';

import { VendorRiskAssessmentView } from '@/components/vendor-risk-assessment/VendorRiskAssessmentView';
import type { Member, User, Vendor } from '@db';
import type { Prisma } from '@prisma/client';
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
import { useState } from 'react';
import { VendorActions } from './VendorActions';
import { VendorPageClient } from './VendorPageClient';

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

export function VendorDetailTabs({
  vendorId,
  orgId,
  vendor,
  assignees,
  isViewingTask,
}: VendorDetailTabsProps) {
  const [isEditSheetOpen, setIsEditSheetOpen] = useState(false);

  const breadcrumbs = [
    { label: 'Vendors', href: `/${orgId}/vendors` },
    {
      label: vendor?.name ?? '',
      href: isViewingTask ? `/${orgId}/vendors/${vendorId}` : undefined,
      isCurrent: !isViewingTask,
    },
  ];

  const riskAssessmentData = vendor.riskAssessmentData;
  const riskAssessmentUpdatedAt = vendor.riskAssessmentUpdatedAt ?? null;

  return (
    <Tabs defaultValue="overview">
      <PageLayout
        header={
          <PageHeader
            title={vendor?.name ?? 'Vendor'}
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
            initialVendor={vendor}
            assignees={assignees}
            isViewingTask={isViewingTask}
            isEditSheetOpen={isEditSheetOpen}
            onEditSheetOpenChange={setIsEditSheetOpen}
          />
        </TabsContent>

        <TabsContent value="risk-assessment">
          <Stack gap="md">
            {riskAssessmentData ? (
              <VendorRiskAssessmentView
                source={{
                  title: 'Risk Assessment',
                  description: JSON.stringify(riskAssessmentData),
                  createdAt: (riskAssessmentUpdatedAt ?? vendor.updatedAt).toISOString(),
                  entityType: 'vendor',
                  createdByName: null,
                  createdByEmail: null,
                }}
              />
            ) : (
              <div className="rounded-lg border border-border bg-card p-8 text-center">
                <Text variant="muted" size="sm">
                  {vendor.status === 'in_progress'
                    ? 'Risk assessment is being generated. Please check back soon.'
                    : 'No risk assessment found yet.'}
                </Text>
              </div>
            )}
          </Stack>
        </TabsContent>
      </PageLayout>
    </Tabs>
  );
}
