'use client';

import { Badge } from '@comp/ui/badge';
import { Button } from '@comp/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@comp/ui/card';
import { cn } from '@comp/ui/cn';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@comp/ui/dropdown-menu';
import { Progress } from '@comp/ui/progress';
import { Control, Task } from '@db';
import { BarChart3, MoreVertical, Target, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { getControlStatus } from '../../lib/utils';
import { FrameworkInstanceWithControls } from '../../types';
import { FrameworkDeleteDialog } from './FrameworkDeleteDialog';

interface FrameworkOverviewProps {
  frameworkInstanceWithControls: FrameworkInstanceWithControls;
  tasks: (Task & { controls: Control[] })[];
}

export function FrameworkOverview({
  frameworkInstanceWithControls,
  tasks,
}: FrameworkOverviewProps) {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  // Get all controls from all requirements
  const allControls = frameworkInstanceWithControls.controls;
  const totalControls = allControls.length;

  // Calculate compliant controls (all artifacts completed)
  const compliantControls = allControls.filter(
    (control: any) => getControlStatus(control.policies, tasks, control.id) === 'completed',
  ).length;

  // Calculate compliance percentage based on compliant controls
  const compliancePercentage =
    totalControls > 0 ? Math.round((compliantControls / totalControls) * 100) : 0;

  const getComplianceColor = (score: number) => {
    if (score >= 80) return 'text-green-600 dark:text-green-400';
    if (score >= 60) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-red-600 dark:text-red-400';
  };

  const getComplianceBadgeVariant = () => {
    if (compliancePercentage >= 80) return 'default';
    if (compliancePercentage >= 60) return 'secondary';
    return 'destructive';
  };

  const inProgressControls = totalControls - compliantControls;

  return (
    <div className="space-y-6">
      {/* Framework Header */}
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold tracking-tight">
              {frameworkInstanceWithControls.framework.name}
            </h1>
            <Badge variant={getComplianceBadgeVariant()}>{compliancePercentage}%</Badge>
          </div>
          <p className="text-muted-foreground max-w-2xl text-sm">
            {frameworkInstanceWithControls.framework.description}
          </p>
        </div>
        <DropdownMenu open={dropdownOpen} onOpenChange={setDropdownOpen}>
          <DropdownMenuTrigger asChild>
            <Button size="sm" variant="ghost">
              <MoreVertical className="h-4 w-4" />
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
              <Trash2 className="mr-2 h-4 w-4" />
              Delete Framework
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Compliance Dashboard */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Progress Card */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <BarChart3 className="h-4 w-4" />
              Compliance Progress
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-end gap-4">
              <div className="flex-1">
                <div className="mb-2 flex items-baseline gap-2">
                  <span
                    className={cn(
                      'text-3xl font-bold tabular-nums',
                      getComplianceColor(compliancePercentage),
                    )}
                  >
                    {compliancePercentage}
                  </span>
                  <span className="text-muted-foreground text-sm">% complete</span>
                </div>
                <Progress value={compliancePercentage} className="h-2" />
              </div>
            </div>
            <div className="text-muted-foreground flex items-center gap-6 text-sm">
              <span>{compliantControls} completed</span>
              <span>{inProgressControls} remaining</span>
              <span>{totalControls} total</span>
            </div>
          </CardContent>
        </Card>

        {/* Stats Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Target className="h-4 w-4" />
              Control Status
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between py-2">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-primary"></div>
                <span className="text-sm">Complete</span>
              </div>
              <span className="font-medium tabular-nums">{compliantControls}</span>
            </div>
            <div className="flex items-center justify-between py-2">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-blue-500"></div>
                <span className="text-sm">In Progress</span>
              </div>
              <span className="font-medium tabular-nums">{inProgressControls}</span>
            </div>
            <div className="flex items-center justify-between border-t py-2 pt-3">
              <span className="text-sm font-medium">Total</span>
              <span className="font-semibold tabular-nums">{totalControls}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Delete Dialog */}
      <FrameworkDeleteDialog
        isOpen={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        frameworkInstance={frameworkInstanceWithControls}
      />
    </div>
  );
}
