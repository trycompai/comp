'use client';

import type { Control, Task } from '@db';
import {
  Badge,
  Button,
  PageHeader,
  Text,
} from '@trycompai/design-system';
import { TrashCan, OverflowMenuVertical } from '@trycompai/design-system/icons';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@trycompai/ui/dropdown-menu';
import { useState } from 'react';
import { usePermissions } from '@/hooks/use-permissions';
import { getControlStatus } from '@/lib/control-compliance';
import type { FrameworkInstanceWithControls } from '@/lib/types/framework';
import { FrameworkDeleteDialog } from './FrameworkDeleteDialog';
import { AddCustomRequirementSheet } from './AddCustomRequirementSheet';
import { LinkRequirementSheet } from './LinkRequirementSheet';

interface EvidenceSubmissionInfo {
  id: string;
  formType: string;
  createdAt: Date | string;
}

interface FrameworkOverviewProps {
  frameworkInstanceWithControls: FrameworkInstanceWithControls;
  tasks: (Task & { controls: Control[] })[];
  evidenceSubmissions?: EvidenceSubmissionInfo[];
}

export function FrameworkOverview({
  frameworkInstanceWithControls,
  tasks,
  evidenceSubmissions = [],
}: FrameworkOverviewProps) {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const { hasPermission } = usePermissions();

  const allControls = frameworkInstanceWithControls.controls;
  const totalControls = allControls.length;

  const compliantControls = allControls.filter(
    (control) => getControlStatus(
      control.policies,
      tasks,
      control.id,
      control.controlDocumentTypes,
      evidenceSubmissions,
    ) === 'completed',
  ).length;

  const compliancePercentage =
    totalControls > 0 ? Math.round((compliantControls / totalControls) * 100) : 0;

  const getComplianceBadgeVariant = (): 'default' | 'secondary' | 'destructive' => {
    if (compliancePercentage >= 80) return 'default';
    if (compliancePercentage >= 60) return 'secondary';
    return 'destructive';
  };

  const inProgressControls = totalControls - compliantControls;

  const frameworkDisplayName =
    frameworkInstanceWithControls.framework?.name ??
    frameworkInstanceWithControls.customFramework?.name ??
    'Framework';
  const frameworkDisplayDescription =
    frameworkInstanceWithControls.framework?.description ??
    frameworkInstanceWithControls.customFramework?.description ??
    '';

  return (
    <div className="space-y-6">
      <PageHeader
        title={frameworkDisplayName}
        actions={
          <>
            <LinkRequirementSheet
              frameworkInstanceId={frameworkInstanceWithControls.id}
            />
            <AddCustomRequirementSheet
              frameworkInstanceId={frameworkInstanceWithControls.id}
            />
            {hasPermission('framework', 'delete') ? (
              <DropdownMenu open={dropdownOpen} onOpenChange={setDropdownOpen}>
                <DropdownMenuTrigger asChild>
                  <Button size="sm" variant="ghost">
                    <OverflowMenuVertical size={16} />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
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
                </DropdownMenuContent>
              </DropdownMenu>
            ) : null}
          </>
        }
      />
      {frameworkDisplayDescription && (
        <div className="max-w-2xl">
          <Text size="sm" variant="muted">
            {frameworkDisplayDescription}
          </Text>
        </div>
      )}

      <div className="flex items-center gap-6 text-sm">
        <Badge variant={getComplianceBadgeVariant()}>{compliancePercentage}% compliant</Badge>
        <Text size="sm" variant="muted">{compliantControls} completed</Text>
        <Text size="sm" variant="muted">{inProgressControls} remaining</Text>
        <Text size="sm" variant="muted">{totalControls} total controls</Text>
      </div>

      <div className="h-2 w-full rounded-full bg-muted/50">
        <div
          className="h-full rounded-full bg-primary transition-all duration-300"
          style={{ width: `${compliancePercentage}%` }}
        />
      </div>

      <FrameworkDeleteDialog
        isOpen={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        frameworkInstance={frameworkInstanceWithControls}
      />
    </div>
  );
}
