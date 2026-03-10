'use client';

import { RecentAuditLogs } from '@/components/RecentAuditLogs';
import { useAuditLogs } from '@/hooks/use-audit-logs';
import { Button } from '@comp/ui/button';
import type { EvidenceAutomation, EvidenceAutomationRun, EvidenceAutomationVersion, Task } from '@db';
import {
  Breadcrumb,
  Button as DSButton,
  HStack,
  PageLayout,
  Section,
  Stack,
  Switch,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Text,
} from '@trycompai/design-system';
import { Code2, Loader2, Play, Trash2 } from 'lucide-react';
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
  evidenceAutomation: { name: string };
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
  const [isEditingName, setIsEditingName] = useState(false);
  const [nameValue, setNameValue] = useState('');
  const [isEditingDescription, setIsEditingDescription] = useState(false);
  const [descriptionValue, setDescriptionValue] = useState('');
  const [selectedVersion, setSelectedVersion] = useState<number | null>(null);
  const [isTestingVersion, setIsTestingVersion] = useState(false);

  const {
    automation: liveAutomation,
    mutate: mutateAutomation,
    updateAutomation,
  } = useTaskAutomation();

  const { runs: liveRuns, mutate: mutateRuns } = useAutomationRuns();

  const automation = liveAutomation || initialAutomation;
  const runs = liveRuns || initialRuns;

  const latestVersion = initialVersions.length > 0 ? initialVersions[0].version : null;
  if (selectedVersion === null && latestVersion !== null) {
    setSelectedVersion(latestVersion);
  }

  const startEditingName = () => {
    setNameValue(automation.name);
    setIsEditingName(true);
  };

  const saveNameEdit = async () => {
    if (!nameValue.trim() || nameValue === automation.name) {
      setIsEditingName(false);
      return;
    }
    try {
      await updateAutomation({ name: nameValue.trim() });
      toast.success('Name updated');
      setIsEditingName(false);
      await mutateAutomation();
    } catch {
      toast.error('Failed to update name');
    }
  };

  const startEditingDescription = () => {
    setDescriptionValue(automation.description || '');
    setIsEditingDescription(true);
  };

  const saveDescriptionEdit = async () => {
    if (descriptionValue === (automation.description || '')) {
      setIsEditingDescription(false);
      return;
    }
    try {
      await updateAutomation({ description: descriptionValue.trim() });
      toast.success('Description updated');
      setIsEditingDescription(false);
      await mutateAutomation();
    } catch {
      toast.error('Failed to update description');
    }
  };

  const handleToggleEnabled = async (enabled: boolean) => {
    if (!automation?.id) return;
    setIsTogglingEnabled(true);
    try {
      const result = await toggleAutomationEnabled(taskId, automation.id, enabled);
      if (!result.success) throw new Error(result.error || 'Failed to toggle automation');
      toast.success(enabled ? 'Automation enabled' : 'Automation disabled');
      await mutateAutomation();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to toggle automation');
    } finally {
      setIsTogglingEnabled(false);
    }
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
          description: 'Test started - check run history',
        });
        const runId = result.data?.runId || `pending-${Date.now()}`;
        const now = new Date();
        mutateRuns(
          (currentRuns) => {
            const pendingRun: RunWithAutomationName = {
              id: runId,
              evidenceAutomationId: automation.id,
              taskId,
              status: 'pending',
              success: null,
              output: null,
              error: null,
              version: selectedVersion,
              evaluationStatus: null,
              evaluationReason: null,
              createdAt: now,
              updatedAt: now,
              completedAt: null,
              startedAt: now,
              logs: null,
              runDuration: null,
              triggeredBy: 'manual',
              evidenceAutomation: { name: automation.name },
            };
            const existing = Array.isArray(currentRuns) ? currentRuns : [];
            return [pendingRun, ...existing];
          },
          false,
        );
      } else {
        toast.error(result.error || 'Failed to start test');
      }
    } catch {
      toast.error('Failed to start test');
    } finally {
      setIsTestingVersion(false);
    }
  };

  const runsWithName: RunWithAutomationName[] = (runs || []).map((run) => ({
    ...run,
    evidenceAutomation: (run as RunWithAutomationName).evidenceAutomation || {
      name: automation.name,
    },
  }));

  return (
    <PageLayout>
      <Breadcrumb
        items={[
          {
            label: 'Evidence',
            href: `/${orgId}/tasks`,
            props: { render: <Link href={`/${orgId}/tasks`} /> },
          },
          {
            label: task.title,
            href: `/${orgId}/tasks/${taskId}`,
            props: { render: <Link href={`/${orgId}/tasks/${taskId}`} /> },
          },
          { label: automation.name, isCurrent: true },
        ]}
      />

      <Stack gap="xs">
        <HStack justify="between" align="center">
          {isEditingName ? (
            <input
              value={nameValue}
              onChange={(e) => setNameValue(e.target.value)}
              onBlur={saveNameEdit}
              onKeyDown={(e) => {
                if (e.key === 'Enter') saveNameEdit();
                if (e.key === 'Escape') setIsEditingName(false);
              }}
              className="text-2xl font-semibold tracking-tight bg-transparent border-b border-primary outline-none flex-1"
              autoFocus
            />
          ) : (
            <h1
              onClick={startEditingName}
              className="text-2xl font-semibold tracking-tight cursor-pointer rounded px-1 -mx-1 hover:bg-muted/50 transition-colors"
            >
              {automation.name}
            </h1>
          )}
          <Link href={`/${orgId}/tasks/${taskId}/automation/${automationId}`}>
            <Button size="sm">
              <Code2 className="h-4 w-4 mr-2" />
              Edit Script
            </Button>
          </Link>
        </HStack>
        {isEditingDescription ? (
          <textarea
            value={descriptionValue}
            onChange={(e) => setDescriptionValue(e.target.value)}
            onBlur={saveDescriptionEdit}
            onKeyDown={(e) => {
              if (e.key === 'Escape') setIsEditingDescription(false);
            }}
            className="text-sm text-muted-foreground bg-transparent border-b border-primary outline-none resize-none w-full"
            rows={5}
            autoFocus
          />
        ) : (
          <Text
            size="sm"
            variant="muted"
            as="p"
            onClick={startEditingDescription}
            style={{ cursor: 'pointer' }}
          >
            {automation.description || 'Add a description...'}
          </Text>
        )}
      </Stack>

      <MetricsSection
        initialVersions={initialVersions}
        initialRuns={runs}
      />

      <Tabs defaultValue="history">
        <Stack gap="lg">
          <TabsList variant="underline">
            <TabsTrigger value="history">Run History</TabsTrigger>
            <TabsTrigger value="versions">Versions</TabsTrigger>
            <TabsTrigger value="activity">Activity</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>

          <TabsContent value="history">
            <AutomationRunsCard runs={runsWithName} />
          </TabsContent>

          <TabsContent value="versions">
            {initialVersions.length > 0 ? (
              <Stack gap="sm">
                {initialVersions.map((v) => {
                  const isLatest = v.version === latestVersion;
                  const isTesting = isTestingVersion && selectedVersion === v.version;
                  return (
                    <div
                      key={v.version}
                      className={`flex items-center justify-between rounded-lg border py-3 px-4 ${isLatest ? 'border-primary/50 bg-primary/5' : 'border-border'}`}
                    >
                      <HStack gap="md" align="center">
                        <div>
                          <HStack gap="sm" align="center">
                            <Text size="sm" weight="medium">v{v.version}</Text>
                            {isLatest && (
                              <span className="text-[10px] px-1.5 py-0 rounded-full bg-primary/10 text-primary font-medium">
                                Latest
                              </span>
                            )}
                          </HStack>
                          {v.changelog && (
                            <Text size="xs" variant="muted">{v.changelog}</Text>
                          )}
                          <Text size="xs" variant="muted">
                            {new Date(v.createdAt).toLocaleDateString(undefined, {
                              month: 'short', day: 'numeric', year: 'numeric',
                            })}
                          </Text>
                        </div>
                      </HStack>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setSelectedVersion(v.version);
                          handleTestVersion();
                        }}
                        disabled={isTestingVersion}
                      >
                        {isTesting ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <>
                            <Play className="w-3.5 h-3.5 mr-1.5" />
                            Test
                          </>
                        )}
                      </Button>
                    </div>
                  );
                })}
              </Stack>
            ) : (
              <div className="py-8">
                <Stack gap="sm" align="center">
                  <Text size="sm" variant="muted">No versions published yet</Text>
                </Stack>
              </div>
            )}
          </TabsContent>

          <TabsContent value="activity">
            <AutomationActivity taskId={taskId} automationId={automationId} />
          </TabsContent>

          <TabsContent value="settings">
            <Section title="Automation Settings">
              <Stack gap="lg">
                <HStack justify="between" align="center">
                  <Stack gap="none">
                    <Text size="sm" weight="medium">Enable Automation</Text>
                    <Text size="xs" variant="muted">
                      When enabled, this automation will run on its configured schedule
                    </Text>
                  </Stack>
                  <Switch
                    checked={automation.isEnabled}
                    onCheckedChange={handleToggleEnabled}
                    disabled={isTogglingEnabled}
                  />
                </HStack>

                <div className="border-t" />

                <HStack justify="between" align="center">
                  <Stack gap="none">
                    <Text size="sm" weight="medium">Delete Automation</Text>
                    <Text size="xs" variant="muted">
                      Permanently delete this automation and all its versions
                    </Text>
                  </Stack>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setDeleteDialogOpen(true)}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </Button>
                </HStack>
              </Stack>
            </Section>
          </TabsContent>
        </Stack>
      </Tabs>

      <DeleteAutomationDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onSuccess={mutateAutomation}
      />
    </PageLayout>
  );
}

function AutomationActivity({ taskId, automationId }: { taskId: string; automationId: string }) {
  const { logs } = useAuditLogs({
    entityType: 'task',
    entityId: taskId,
    pathContains: automationId,
  });
  return <RecentAuditLogs logs={logs} />;
}
