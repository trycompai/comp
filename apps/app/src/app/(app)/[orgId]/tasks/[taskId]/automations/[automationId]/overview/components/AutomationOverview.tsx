'use client';

import { api } from '@/lib/api-client';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbSeparator,
} from '@comp/ui/breadcrumb';
import { Button } from '@comp/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@comp/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@comp/ui/dropdown-menu';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@comp/ui/select';
import { Textarea } from '@comp/ui/textarea';
import { EvidenceAutomation, EvidenceAutomationRun, EvidenceAutomationVersion, Task } from '@db';
import { ChevronRight, Loader2, MoreVertical, Play, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useRef, useState } from 'react';
import { toast } from 'sonner';
import {
  executeAutomationScript,
  toggleAutomationEnabled,
} from '../../../../automation/[automationId]/actions/task-automation-actions';
import { DeleteAutomationDialog } from '../../../../automation/[automationId]/components/AutomationSettingsDialogs';
import { useTaskAutomation } from '../../../../automation/[automationId]/hooks/use-task-automation';
import { AutomationRunsCard } from '../../../../components/AutomationRunsCard';
import { useAutomationRuns } from '../hooks/use-automation-runs';
import { MetricsSection } from './MetricsSection';

type RunWithAutomationName = EvidenceAutomationRun & {
  evidenceAutomation: {
    name: string;
  };
};

interface AutomationOverviewProps {
  task: Task;
  automation: EvidenceAutomation;
  initialRuns: RunWithAutomationName[];
  initialVersions: EvidenceAutomationVersion[];
}

export function AutomationOverview({
  task,
  automation: initialAutomation,
  initialRuns,
  initialVersions,
}: AutomationOverviewProps) {
  const { orgId, taskId, automationId } = useParams<{
    orgId: string;
    taskId: string;
    automationId: string;
  }>();

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isTogglingEnabled, setIsTogglingEnabled] = useState(false);
  const [editingDescription, setEditingDescription] = useState(false);
  const [descriptionValue, setDescriptionValue] = useState('');
  const [selectedVersion, setSelectedVersion] = useState<number | null>(null);
  const [isTestingVersion, setIsTestingVersion] = useState(false);
  const descriptionInputRef = useRef<HTMLTextAreaElement>(null);

  // Use the automation hook to get live data and mutate function
  const { automation: liveAutomation, mutate: mutateAutomation } = useTaskAutomation();

  // Use live runs data with auto-refresh
  const { runs: liveRuns, mutate: mutateRuns } = useAutomationRuns();

  // Use live data from hook if available, fallback to initial data
  const automation = liveAutomation || initialAutomation;
  const runs = liveRuns || initialRuns;

  // Set initial selected version to latest
  const latestVersion = initialVersions.length > 0 ? initialVersions[0].version : null;
  if (selectedVersion === null && latestVersion !== null) {
    setSelectedVersion(latestVersion);
  }

  const handleToggleEnabled = async (enabled: boolean) => {
    if (!automation?.id) return;

    setIsTogglingEnabled(true);
    try {
      const result = await toggleAutomationEnabled(automation.id, enabled);

      if (!result.success) {
        throw new Error(result.error || 'Failed to toggle automation');
      }

      toast.success(enabled ? 'Automation enabled' : 'Automation disabled');
      await mutateAutomation();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to toggle automation');
      console.error('Error toggling automation:', error);
    } finally {
      setIsTogglingEnabled(false);
    }
  };

  const handleDescriptionEdit = () => {
    setDescriptionValue(automation.description || '');
    setEditingDescription(true);
    setTimeout(() => descriptionInputRef.current?.focus(), 0);
  };

  const handleTestVersion = async () => {
    if (!selectedVersion) return;

    setIsTestingVersion(true);
    try {
      const result = await executeAutomationScript({
        orgId,
        taskId,
        automationId: automation.id,
        version: selectedVersion,
      });

      if (result.success) {
        toast.success(`Testing version ${selectedVersion}`, {
          description: 'Test started - check run history below',
        });

        // Refresh runs to show the new test
        await mutateRuns();
      } else {
        toast.error(result.error || 'Failed to start test');
      }
    } catch (error) {
      toast.error('Failed to start test');
    } finally {
      setIsTestingVersion(false);
    }
  };

  const saveDescriptionEdit = async () => {
    if (descriptionValue === (automation.description || '')) {
      setEditingDescription(false);
      return;
    }

    try {
      const response = await api.patch(
        `/v1/tasks/${taskId}/automations/${automationId}`,
        { description: descriptionValue.trim() || null },
        orgId,
      );

      if (response.error) {
        throw new Error(response.error);
      }

      await mutateAutomation();
      toast.success('Description updated');
      setEditingDescription(false);
    } catch (error) {
      toast.error('Failed to update description');
      setDescriptionValue(automation.description || '');
      setEditingDescription(false);
    }
  };

  // Transform runs to include automation name
  const runsWithName = runs.map((run) => ({
    ...run,
    evidenceAutomation: {
      name: automation.name,
    },
  }));

  return (
    <div>
      {/* Breadcrumb */}
      <div className="px-8 py-4">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link
                  href={`/${orgId}/tasks`}
                  className="text-muted-foreground hover:text-foreground"
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
                <Link
                  href={`/${orgId}/tasks/${taskId}`}
                  className="text-muted-foreground hover:text-foreground"
                >
                  {task.title}
                </Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator>
              <ChevronRight className="h-4 w-4" />
            </BreadcrumbSeparator>
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <span className="text-foreground font-medium">{automation.name}</span>
              </BreadcrumbLink>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </div>

      <MetricsSection
        automationName={automation.name}
        initialVersions={initialVersions}
        initialRuns={runs}
        isEnabled={automation.isEnabled}
        onToggleEnabled={handleToggleEnabled}
        isTogglingEnabled={isTogglingEnabled}
        editScriptUrl={`/${orgId}/tasks/${taskId}/automation/${automationId}`}
      />

      {/* Main Content - 2 Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 px-8 py-12">
        {/* Left Column - History */}
        <div className="lg:col-span-2">
          <AutomationRunsCard runs={runsWithName} />
        </div>

        {/* Right Column - Versions & Details */}
        <div className="space-y-6">
          {/* Versions Card */}
          {initialVersions.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base font-medium">Versions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Select
                      value={selectedVersion?.toString() || ''}
                      onValueChange={(value) => setSelectedVersion(parseInt(value))}
                    >
                      <SelectTrigger className="h-9 text-sm flex-1">
                        <SelectValue placeholder="Select version" />
                      </SelectTrigger>
                      <SelectContent>
                        {initialVersions.map((v) => (
                          <SelectItem key={v.version} value={v.version.toString()}>
                            v{v.version}
                            {v.changelog &&
                              ` - ${v.changelog.substring(0, 30)}${v.changelog.length > 30 ? '...' : ''}`}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleTestVersion}
                      disabled={!selectedVersion || isTestingVersion}
                    >
                      {isTestingVersion ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                          Testing
                        </>
                      ) : (
                        <>
                          <Play className="w-3.5 h-3.5 mr-1.5" />
                          Test
                        </>
                      )}
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Select a version and test it to verify functionality
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-medium">Details</CardTitle>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      onClick={() => setDeleteDialogOpen(true)}
                      className="text-destructive focus:text-destructive"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete Automation
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-1 group">
                  <p className="text-xs font-medium text-muted-foreground">Description</p>
                  {editingDescription ? (
                    <Textarea
                      ref={descriptionInputRef}
                      value={descriptionValue}
                      onChange={(e) => setDescriptionValue(e.target.value)}
                      onBlur={saveDescriptionEdit}
                      onKeyDown={(e) => {
                        if (e.key === 'Escape') {
                          setEditingDescription(false);
                        }
                      }}
                      className="text-sm min-h-[60px]"
                      rows={3}
                    />
                  ) : (
                    <p
                      onClick={handleDescriptionEdit}
                      className="text-sm cursor-pointer rounded-md px-2 py-1 -mx-2 -my-1 hover:bg-muted/50 transition-colors min-h-[24px]"
                    >
                      {automation.description || (
                        <span className="text-muted-foreground italic">
                          Click to add description
                        </span>
                      )}
                    </p>
                  )}
                </div>

                <div className="flex flex-col gap-1">
                  <p className="text-xs font-medium text-muted-foreground">Created</p>
                  <p className="text-sm">
                    {new Date(automation.createdAt).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}{' '}
                    at{' '}
                    {new Date(automation.createdAt).toLocaleTimeString('en-US', {
                      hour: 'numeric',
                      minute: '2-digit',
                      hour12: true,
                    })}
                  </p>
                </div>
                <div className="flex flex-col gap-1">
                  <p className="text-xs font-medium text-muted-foreground">Last Published</p>
                  <p className="text-sm">
                    {runsWithName[0]?.createdAt ? (
                      <>
                        {new Date(runsWithName[0].createdAt).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}{' '}
                        at{' '}
                        {new Date(runsWithName[0].createdAt).toLocaleTimeString('en-US', {
                          hour: 'numeric',
                          minute: '2-digit',
                          hour12: true,
                        })}
                      </>
                    ) : (
                      'Never'
                    )}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <DeleteAutomationDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onSuccess={mutateAutomation}
      />
    </div>
  );
}
