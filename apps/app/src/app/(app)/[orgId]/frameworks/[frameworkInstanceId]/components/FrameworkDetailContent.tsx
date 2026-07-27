'use client';

import { useFrameworkInstance } from '@/hooks/use-framework-instance';
import { usePermissions } from '@/hooks/use-permissions';
import { getFrameworkAggregatePercent } from '@/lib/control-compliance';
import type { FrameworkUpdateStatus } from '@/types/framework-versioning';
import { useFeatureFlag } from '@trycompai/analytics';
import {
  Button,
  PageHeader,
  PageHeaderDescription,
  PageLayout,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@trycompai/design-system';
import { Edit, OverflowMenuVertical, TrashCan } from '@trycompai/design-system/icons';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@trycompai/ui/dropdown-menu';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useCallback, useMemo, useState } from 'react';
import { AddCustomRequirementSheet } from './AddCustomRequirementSheet';
import { EditCustomFrameworkSheet } from './EditCustomFrameworkSheet';
import { FrameworkControls } from './FrameworkControls';
import { FrameworkControlsGrouped } from './FrameworkControlsGrouped';
import { FrameworkDeleteDialog } from './FrameworkDeleteDialog';
import { FrameworkProgress } from './FrameworkProgress';
import { FrameworkRequirements } from './FrameworkRequirements';
import { FrameworkRequirementsGrouped } from './FrameworkRequirementsGrouped';
import { FrameworkTimeline } from './FrameworkTimeline';
import { FrameworkVersioningSection } from './FrameworkVersioningSection';
import { LinkRequirementSheet } from './LinkRequirementSheet';
import { SyncHistorySection } from './SyncHistorySection';

interface FrameworkDetailContentProps {
  orgId: string;
  frameworkInstanceId: string;
  initialFramework: any;
  initialUpdateStatus?: FrameworkUpdateStatus;
}

const DEFAULT_TAB = 'controls';

export function FrameworkDetailContent({
  orgId,
  frameworkInstanceId,
  initialFramework,
  initialUpdateStatus,
}: FrameworkDetailContentProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { hasPermission, permissions } = usePermissions();
  const complianceTimelineEnabled = useFeatureFlag('is-timeline-enabled');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editSheetOpen, setEditSheetOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const { data, mutate } = useFrameworkInstance<any>(frameworkInstanceId, {
    fallbackData: initialFramework,
  });
  const framework = data ?? initialFramework;
  const frameworkInstanceWithControls = {
    ...framework,
    controls: framework.controls ?? [],
  };

  const frameworkName = framework.framework?.name ?? framework.customFramework?.name ?? 'Framework';
  const frameworkDescription =
    framework.framework?.description ?? framework.customFramework?.description ?? '';

  const tasks = framework.tasks || [];
  const evidenceSubmissions = framework.evidenceSubmissions || [];
  const requirementDefinitions = framework.requirementDefinitions || [];

  const hasControlFamilies = useMemo(
    () =>
      frameworkInstanceWithControls.controls.some(
        (c: { controlFamily?: string | null }) => c.controlFamily,
      ),
    [frameworkInstanceWithControls.controls],
  );

  const hasRequirementFamilies = useMemo(
    () =>
      requirementDefinitions.some(
        (r: { requirementFamily?: string | null }) => r.requirementFamily,
      ),
    [requirementDefinitions],
  );

  // Tab state synced to ?tab=
  // Progress tab only exists when the compliance timeline flag is on — when
  // it's off, the lightweight FrameworkProgress renders above the tabs.
  const tabParam = searchParams.get('tab');
  const validTabsList: string[] = [];
  if (complianceTimelineEnabled) validTabsList.push('progress');
  validTabsList.push('controls');
  validTabsList.push('requirements');
  validTabsList.push('history');
  const validTabs = new Set(validTabsList);
  const activeTab = tabParam && validTabs.has(tabParam) ? tabParam : DEFAULT_TAB;

  const handleTabChange = useCallback(
    (value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value === DEFAULT_TAB) params.delete('tab');
      else params.set('tab', value);
      const q = params.toString();
      router.replace(q ? `${pathname}?${q}` : pathname, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  // Tab label counts
  const compliancePct = computeCompliancePercent(
    frameworkInstanceWithControls.controls,
    tasks,
    evidenceSubmissions,
  );
  const controlsCount = frameworkInstanceWithControls.controls.length;
  const requirementsCount = requirementDefinitions.length;

  const canDeleteFramework = hasPermission('framework', 'delete');
  // Only org-authored custom frameworks have editable name/description; platform
  // frameworks inherit theirs from the shared global template.
  const canEditCustomFramework =
    !!framework.customFramework && hasPermission('framework', 'update');

  return (
    <Tabs value={activeTab} onValueChange={handleTabChange}>
      <PageLayout
        header={
          <PageHeader
            title={frameworkName}
            breadcrumbs={[
              {
                label: 'Frameworks',
                href: `/${orgId}/frameworks`,
                props: { render: <Link href={`/${orgId}/frameworks`} /> },
              },
              { label: frameworkName, isCurrent: true },
            ]}
            actions={
              <>
                <LinkRequirementSheet frameworkInstanceId={frameworkInstanceId} />
                <AddCustomRequirementSheet frameworkInstanceId={frameworkInstanceId} />
                {(canEditCustomFramework || canDeleteFramework) && (
                  <DropdownMenu open={dropdownOpen} onOpenChange={setDropdownOpen}>
                    <DropdownMenuTrigger asChild>
                      <Button size="sm" variant="ghost">
                        <OverflowMenuVertical size={16} />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {canEditCustomFramework && (
                        <DropdownMenuItem
                          onClick={() => {
                            setDropdownOpen(false);
                            setEditSheetOpen(true);
                          }}
                        >
                          <Edit size={16} className="mr-2" />
                          Edit Framework
                        </DropdownMenuItem>
                      )}
                      {canDeleteFramework && (
                        <DropdownMenuItem
                          onClick={() => {
                            setDropdownOpen(false);
                            setDeleteDialogOpen(true);
                          }}
                          className="text-destructive focus:text-destructive"
                        >
                          <TrashCan size={16} className="mr-2" />
                          Delete Framework
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </>
            }
            tabs={
              <TabsList variant="underline">
                {complianceTimelineEnabled && (
                  <TabsTrigger value="progress">
                    Progress <TabBadge>{compliancePct}%</TabBadge>
                  </TabsTrigger>
                )}
                <TabsTrigger value="controls">
                  Controls <TabBadge>{controlsCount}</TabBadge>
                </TabsTrigger>
                <TabsTrigger value="requirements">
                  Requirements <TabBadge>{requirementsCount}</TabBadge>
                </TabsTrigger>
                <TabsTrigger value="history">History</TabsTrigger>
              </TabsList>
            }
          >
            {frameworkDescription && (
              <PageHeaderDescription>{frameworkDescription}</PageHeaderDescription>
            )}
          </PageHeader>
        }
      >
        <FrameworkVersioningSection
          frameworkInstanceId={frameworkInstanceId}
          initialStatus={initialUpdateStatus}
          hasActiveAudit={false}
        />

        {!complianceTimelineEnabled && (
          <FrameworkProgress
            framework={frameworkInstanceWithControls}
            tasks={tasks}
            evidenceSubmissions={evidenceSubmissions}
          />
        )}

        {complianceTimelineEnabled && (
          <TabsContent value="progress">
            <FrameworkTimeline frameworkInstanceId={frameworkInstanceId} />
          </TabsContent>
        )}

        <TabsContent value="controls">
          {hasControlFamilies ? (
            <Suspense>
              <FrameworkControlsGrouped
                frameworkInstanceWithControls={frameworkInstanceWithControls}
                requirementDefinitions={requirementDefinitions}
                tasks={tasks}
                evidenceSubmissions={evidenceSubmissions}
              />
            </Suspense>
          ) : (
            <FrameworkControls
              frameworkInstanceWithControls={frameworkInstanceWithControls}
              requirementDefinitions={requirementDefinitions}
              tasks={tasks}
              evidenceSubmissions={evidenceSubmissions}
            />
          )}
        </TabsContent>

        <TabsContent value="requirements">
          {hasRequirementFamilies ? (
            <Suspense>
              <FrameworkRequirementsGrouped
                requirementDefinitions={requirementDefinitions}
                frameworkInstanceWithControls={frameworkInstanceWithControls}
                tasks={tasks}
                evidenceSubmissions={evidenceSubmissions}
              />
            </Suspense>
          ) : (
            <FrameworkRequirements
              requirementDefinitions={requirementDefinitions}
              frameworkInstanceWithControls={frameworkInstanceWithControls}
              tasks={tasks}
              evidenceSubmissions={evidenceSubmissions}
            />
          )}
        </TabsContent>

        <TabsContent value="history">
          <SyncHistorySection
            frameworkInstanceId={frameworkInstanceId}
            permissions={permissions}
          />
        </TabsContent>
      </PageLayout>

      <FrameworkDeleteDialog
        isOpen={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        frameworkInstance={frameworkInstanceWithControls}
      />

      {canEditCustomFramework && (
        <EditCustomFrameworkSheet
          isOpen={editSheetOpen}
          onClose={() => setEditSheetOpen(false)}
          frameworkInstance={frameworkInstanceWithControls}
          onUpdated={() => mutate()}
        />
      )}
    </Tabs>
  );
}

function TabBadge({ children }: { children: React.ReactNode }) {
  return (
    <span className="ml-1 rounded-full bg-muted px-1.5 py-0.5 text-xs tabular-nums">
      {children}
    </span>
  );
}

function computeCompliancePercent(
  controls: any[],
  tasks: any[],
  evidenceSubmissions: any[],
): number {
  return getFrameworkAggregatePercent(controls, tasks, evidenceSubmissions);
}
