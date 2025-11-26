'use client';

import { updateTaskViewPreference } from '@/actions/tasks';
import { Button, Tabs, TabsContent, TabsList, TabsTrigger } from '@comp/ui';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@comp/ui/select';
import { Separator } from '@comp/ui/separator';
import type { Member, Task, User } from '@db';
import { Check, Circle, FolderTree, List, Plus, XCircle } from 'lucide-react';
import Image from 'next/image';
import { useParams } from 'next/navigation';
import { useQueryState } from 'nuqs';
import { useEffect, useMemo, useState } from 'react';
import { CreateTaskSheet } from './CreateTaskSheet';
import { ModernTaskList } from './ModernTaskList';
import { SearchInput } from './SearchInput';
import { TasksByCategory } from './TasksByCategory';

const statuses = [
  { id: 'todo', label: 'Todo', icon: Circle, color: 'text-slate-400' },
  { id: 'in_progress', label: 'In Progress', icon: Circle, color: 'text-blue-400' },
  { id: 'done', label: 'Done', icon: Check, color: 'text-emerald-400' },
  { id: 'failed', label: 'Failed', icon: XCircle, color: 'text-red-400' },
  { id: 'not_relevant', label: 'Not Relevant', icon: Circle, color: 'text-slate-500' },
] as const;

export function TaskList({
  tasks: initialTasks,
  members,
  controls,
  activeTab,
}: {
  tasks: (Task & {
    controls: { id: string; name: string }[];
    evidenceAutomations?: Array<{
      id: string;
      isEnabled: boolean;
      name: string;
      runs?: Array<{
        status: string;
        success: boolean | null;
        evaluationStatus: string | null;
        createdAt: Date;
        triggeredBy: string;
        runDuration: number | null;
      }>;
    }>;
  })[];
  members: (Member & { user: User })[];
  controls: { id: string; name: string }[];
  activeTab: 'categories' | 'list';
}) {
  const params = useParams();
  const orgId = params.orgId as string;
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useQueryState('status');
  const [assigneeFilter, setAssigneeFilter] = useQueryState('assignee');
  const [createTaskOpen, setCreateTaskOpen] = useQueryState('create-task');
  const [currentTab, setCurrentTab] = useState<'categories' | 'list'>(activeTab);

  // Sync activeTab prop with state when it changes
  useEffect(() => {
    setCurrentTab(activeTab);
  }, [activeTab]);

  const handleTabChange = async (value: string) => {
    const newTab = value as 'categories' | 'list';
    setCurrentTab(newTab);
    await updateTaskViewPreference({ view: newTab, orgId });
  };

  const eligibleAssignees = useMemo(() => {
    return members
      .filter((member) => {
        const roleValue = member.role;
        const roles = Array.isArray(roleValue)
          ? roleValue.map((role) => role.trim().toLowerCase())
          : typeof roleValue === 'string'
            ? roleValue.split(',').map((role) => role.trim().toLowerCase())
            : [];

        return roles.some((role) => role === 'admin' || role === 'owner');
      })
      .sort((a, b) => {
        const nameA = a.user.name ?? '';
        const nameB = b.user.name ?? '';
        return nameA.localeCompare(nameB);
      });
  }, [members]);

  // Filter tasks by search query, status, and assignee
  const filteredTasks = initialTasks.filter((task) => {
    const matchesSearch =
      searchQuery === '' ||
      task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      task.description?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = !statusFilter || task.status === statusFilter;
    const matchesAssignee = !assigneeFilter || task.assigneeId === assigneeFilter;

    return matchesSearch && matchesStatus && matchesAssignee;
  });

  // Calculate overall stats from all tasks (not filtered)
  const overallStats = useMemo(() => {
    const total = initialTasks.length;
    const done = initialTasks.filter(
      (t) => t.status === 'done' || t.status === 'not_relevant',
    ).length;
    const inProgress = initialTasks.filter((t) => t.status === 'in_progress').length;
    const todo = initialTasks.filter((t) => t.status === 'todo').length;
    const completionRate = total > 0 ? Math.round((done / total) * 100) : 0;

    // Automation stats
    const tasksWithAutomation = initialTasks.filter(
      (t) => (t.evidenceAutomations?.length ?? 0) > 0,
    ).length;
    const enabledAutomations = initialTasks.reduce((acc, t) => {
      return acc + (t.evidenceAutomations?.filter((a) => a.isEnabled).length ?? 0);
    }, 0);

    // Calculate detailed automation stats
    let totalRuns = 0;
    let successfulRuns = 0;
    let failedRuns = 0;
    let runningCount = 0;
    let healthyCount = 0;
    let errorCount = 0;
    let totalRunDuration = 0;
    let runsWithDuration = 0;
    let recentRuns24h = 0;
    const now = Date.now();
    const oneDayAgo = now - 24 * 60 * 60 * 1000;

    let recentRuns: Array<{
      taskTitle: string;
      automationName: string;
      status: string;
      success: boolean | null;
      evaluationStatus: string | null;
      createdAt: Date;
      triggeredBy: string;
      runDuration: number | null;
    }> = [];

    let activeAutomations: Array<{
      id: string;
      name: string;
      taskTitle: string;
      taskId: string;
      isEnabled: boolean;
      latestRun: {
        status: string;
        success: boolean | null;
        evaluationStatus: string | null;
        createdAt: Date;
      } | null;
    }> = [];

    initialTasks.forEach((t) => {
      const enabled = t.evidenceAutomations?.filter((a) => a.isEnabled) || [];
      enabled.forEach((auto) => {
        const runs = auto.runs || [];
        totalRuns += runs.length;

        // Collect active automations
        const latestRun = runs.length > 0 ? runs[0] : null;
        activeAutomations.push({
          id: auto.id,
          name: auto.name,
          taskTitle: t.title,
          taskId: t.id,
          isEnabled: auto.isEnabled,
          latestRun: latestRun
            ? {
                status: latestRun.status,
                success: latestRun.success,
                evaluationStatus: latestRun.evaluationStatus,
                createdAt: latestRun.createdAt,
              }
            : null,
        });

        runs.forEach((run) => {
          // Count stats
          if (run.status === 'completed' && run.success && run.evaluationStatus !== 'fail') {
            successfulRuns++;
            healthyCount++;
          } else if (run.status === 'failed' || run.evaluationStatus === 'fail') {
            failedRuns++;
            errorCount++;
          } else if (run.status === 'running') {
            runningCount++;
          }

          // Track run duration for average
          if (run.runDuration !== null && run.runDuration > 0) {
            totalRunDuration += run.runDuration;
            runsWithDuration++;
          }

          // Count recent runs (last 24h)
          if (run.createdAt && new Date(run.createdAt).getTime() > oneDayAgo) {
            recentRuns24h++;
          }

          // Collect recent runs
          if (run.createdAt) {
            recentRuns.push({
              taskTitle: t.title,
              automationName: auto.name,
              status: run.status,
              success: run.success,
              evaluationStatus: run.evaluationStatus,
              createdAt: run.createdAt,
              triggeredBy: run.triggeredBy,
              runDuration: run.runDuration,
            });
          }
        });
      });
    });

    // Sort recent runs by date and take most recent
    recentRuns.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    recentRuns = recentRuns.slice(0, 10);

    const automationHealth = {
      healthy: healthyCount,
      error: errorCount,
      running: runningCount,
    };

    const automationRate = total > 0 ? Math.round((tasksWithAutomation / total) * 100) : 0;
    const successRate = totalRuns > 0 ? Math.round((successfulRuns / totalRuns) * 100) : 0;
    const avgRunDuration =
      runsWithDuration > 0 ? Math.round(totalRunDuration / runsWithDuration) : 0;

    return {
      total,
      done,
      inProgress,
      todo,
      completionRate,
      tasksWithAutomation,
      enabledAutomations,
      automationRate,
      automationHealth,
      totalRuns,
      successfulRuns,
      failedRuns,
      successRate,
      recentRuns,
      avgRunDuration,
      recentRuns24h,
      activeAutomations,
    };
  }, [initialTasks]);

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-foreground text-xl font-semibold tracking-tight">Tasks</h1>
          <p className="text-muted-foreground mt-0.5 text-sm">
            Manage and track your compliance tasks
          </p>
        </div>
        <Button
          variant="default"
          size="sm"
          className="self-start sm:self-auto"
          onClick={() => setCreateTaskOpen('true')}
        >
          <Plus className="h-3.5 w-3.5" />
          <span className="text-xs">New Task</span>
        </Button>
      </div>

      {/* Analytics Dashboard */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Main Progress Section */}
        {initialTasks.length > 0 && (
          <>
            <div className="lg:col-span-3 space-y-2">
              <div className="flex items-center justify-between">
                <div className="text-muted-foreground text-[10px] font-medium uppercase tracking-wider">
                  Progress
                </div>
                <div className="text-foreground text-lg font-semibold tabular-nums">
                  {overallStats.completionRate}%
                </div>
              </div>
              <div className="space-y-1.5">
                <div className="bg-secondary/50 h-1 w-full overflow-hidden rounded-full">
                  <div
                    className="bg-primary h-full transition-all duration-700 ease-out"
                    style={{ width: `${overallStats.completionRate}%` }}
                  />
                </div>
                <div className="flex items-center justify-between text-[10px] text-muted-foreground tabular-nums">
                  <span>
                    {overallStats.done} / {overallStats.total}
                  </span>
                  <span>{overallStats.total - overallStats.done} remaining</span>
                </div>
              </div>
            </div>

            {/* Status Breakdown */}
            <div className="lg:col-span-6 grid grid-cols-3 gap-3 lg:pl-3 xl:pl-4">
              {/* Completed */}
              <div className="border-l-2 border-l-primary bg-card/50 px-3 py-2">
                <div className="text-muted-foreground mb-1 text-[10px] font-medium uppercase tracking-wider">
                  Done
                </div>
                <div className="text-foreground text-xl font-semibold tabular-nums mb-0.5">
                  {overallStats.done}
                </div>
                <div className="text-muted-foreground text-[10px] tabular-nums">
                  {overallStats.total > 0
                    ? Math.round((overallStats.done / overallStats.total) * 100)
                    : 0}
                  %
                </div>
              </div>

              {/* In Progress */}
              <div className="border-l-2 border-l-blue-500 bg-card/50 px-3 py-2">
                <div className="text-muted-foreground mb-1 text-[10px] font-medium uppercase tracking-wider">
                  Active
                </div>
                <div className="text-foreground text-xl font-semibold tabular-nums mb-0.5">
                  {overallStats.inProgress}
                </div>
                <div className="text-muted-foreground text-[10px] tabular-nums">
                  {overallStats.total > 0
                    ? Math.round((overallStats.inProgress / overallStats.total) * 100)
                    : 0}
                  %
                </div>
              </div>

              {/* To Do */}
              <div className="border-l-2 border-l-muted-foreground/30 bg-card/50 px-3 py-2">
                <div className="text-muted-foreground mb-1 text-[10px] font-medium uppercase tracking-wider">
                  Pending
                </div>
                <div className="text-foreground text-xl font-semibold tabular-nums mb-0.5">
                  {overallStats.todo}
                </div>
                <div className="text-muted-foreground text-[10px] tabular-nums">
                  {overallStats.total > 0
                    ? Math.round((overallStats.todo / overallStats.total) * 100)
                    : 0}
                  %
                </div>
              </div>
            </div>
          </>
        )}

        {/* Automation Intelligence Hub - Always Visible */}
        <div
          className={`lg:col-span-3 border-l-2 border-l-primary/30 bg-card/50 px-3 py-2.5 ${initialTasks.length === 0 ? 'lg:col-span-12' : ''}`}
        >
          <div className="space-y-2.5">
            <div className="flex items-center gap-2">
              {/* Custom geometric icon matching task page */}
              <div className="relative">
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 16 16"
                  fill="none"
                  className="text-primary"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <rect
                    x="2"
                    y="2"
                    width="4"
                    height="4"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    fill="none"
                    className="animate-pulse"
                  />
                  <rect
                    x="10"
                    y="2"
                    width="4"
                    height="4"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    fill="none"
                    opacity="0.7"
                  />
                  <rect
                    x="2"
                    y="10"
                    width="4"
                    height="4"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    fill="none"
                    opacity="0.7"
                  />
                  <rect
                    x="10"
                    y="10"
                    width="4"
                    height="4"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    fill="none"
                    opacity="0.5"
                  />
                  <line
                    x1="6"
                    y1="4"
                    x2="10"
                    y2="4"
                    stroke="currentColor"
                    strokeWidth="1"
                    opacity="0.4"
                  />
                  <line
                    x1="6"
                    y1="12"
                    x2="10"
                    y2="12"
                    stroke="currentColor"
                    strokeWidth="1"
                    opacity="0.4"
                  />
                  <line
                    x1="4"
                    y1="6"
                    x2="4"
                    y2="10"
                    stroke="currentColor"
                    strokeWidth="1"
                    opacity="0.4"
                  />
                  <line
                    x1="12"
                    y1="6"
                    x2="12"
                    y2="10"
                    stroke="currentColor"
                    strokeWidth="1"
                    opacity="0.4"
                  />
                </svg>
              </div>
              <h3 className="text-[10px] font-semibold text-foreground uppercase tracking-[0.15em]">
                Automation
              </h3>
            </div>

            <div className="space-y-2">
              <div className="flex items-baseline gap-3">
                <div>
                  <div className="text-foreground text-xl font-semibold tabular-nums">
                    {overallStats.enabledAutomations}
                  </div>
                  <div className="text-muted-foreground text-[9px] tabular-nums">Active</div>
                </div>
                {overallStats.automationHealth.running > 0 && (
                  <>
                    <div className="h-5 w-px bg-border" />
                    <div className="flex items-center gap-1.5">
                      <div className="relative">
                        <div className="h-2 w-2 rounded-full bg-blue-500 animate-pulse" />
                        <div className="absolute inset-0 h-2 w-2 rounded-full bg-blue-500 animate-ping opacity-75" />
                      </div>
                      <div>
                        <div className="text-foreground text-sm font-semibold tabular-nums">
                          {overallStats.automationHealth.running}
                        </div>
                        <div className="text-muted-foreground text-[9px] tabular-nums">Running</div>
                      </div>
                    </div>
                  </>
                )}
                {overallStats.successRate > 0 && (
                  <>
                    <div className="h-5 w-px bg-border" />
                    <div>
                      <div className="text-foreground text-sm font-semibold tabular-nums">
                        {overallStats.successRate}%
                      </div>
                      <div className="text-muted-foreground text-[9px] tabular-nums">Success</div>
                    </div>
                  </>
                )}
              </div>

              {overallStats.recentRuns24h > 0 && (
                <div className="flex items-center gap-2 rounded-sm border border-border/50 bg-muted/10 px-2 py-1.5 text-[10px] text-muted-foreground">
                  <div className="flex h-2 w-2 items-center justify-center">
                    <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                  </div>
                  <span className="tabular-nums text-foreground">{overallStats.recentRuns24h}</span>
                  <span className="uppercase tracking-[0.2em] text-muted-foreground/60">
                    runs in last 24h
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Separator after Analytics */}
      <Separator />

      {/* Unified Control Module */}
      <Tabs value={currentTab} onValueChange={handleTabChange}>
        <div className="flex w-full flex-col gap-2 lg:flex-row lg:items-center">
          {/* Filters */}
          <div className="flex w-full flex-col gap-2 lg:flex-row lg:flex-wrap lg:items-center lg:gap-2 lg:flex-1">
            <div className="w-full sm:flex-1 lg:max-w-[200px]">
              <SearchInput
                placeholder="Search tasks..."
                className="text-xs"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <div className="h-6 w-px bg-border hidden lg:block" />

            {/* Status + Assignee */}
            <div className="flex w-full flex-col gap-3 lg:w-auto lg:flex-row lg:items-center lg:gap-2">
              <Select
                value={statusFilter || 'all'}
                onValueChange={(value) => setStatusFilter(value === 'all' ? null : value)}
              >
                <SelectTrigger className="h-9 w-full min-w-0 text-xs lg:w-auto lg:min-w-[180px]">
                  <SelectValue placeholder="All statuses">
                    {(() => {
                      if (!statusFilter) return 'All statuses';
                      const selectedStatus = statuses.find((s) => s.id === statusFilter);
                      if (!selectedStatus) return 'All statuses';
                      const StatusIcon = selectedStatus.icon;
                      return (
                        <div className="flex items-center gap-1.5">
                          <StatusIcon className={`h-3.5 w-3.5 ${selectedStatus.color}`} />
                          <span>{selectedStatus.label}</span>
                        </div>
                      );
                    })()}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">
                    <span className="text-xs">All statuses</span>
                  </SelectItem>
                  {statuses.map((status) => {
                    const StatusIcon = status.icon;
                    return (
                      <SelectItem key={status.id} value={status.id}>
                        <div className="flex items-center gap-2 text-xs">
                          <StatusIcon className={`h-3.5 w-3.5 ${status.color}`} />
                          <span>{status.label}</span>
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>

              <Select
                value={assigneeFilter || 'all'}
                onValueChange={(value) => setAssigneeFilter(value === 'all' ? null : value)}
              >
                <SelectTrigger
                  className="h-9 w-full min-w-0 text-xs lg:w-auto lg:min-w-[180px]"
                  disabled={eligibleAssignees.length === 0}
                >
                  <SelectValue placeholder="Everyone">
                    {(() => {
                      if (eligibleAssignees.length === 0) return 'No eligible members';
                      if (!assigneeFilter) return 'Everyone';
                      const selectedMember = eligibleAssignees.find(
                        (member) => member.id === assigneeFilter,
                      );
                      if (!selectedMember) return 'Everyone';
                      return (
                        <div className="flex items-center gap-2">
                          {selectedMember.user.image ? (
                            <Image
                              src={selectedMember.user.image}
                              alt={selectedMember.user.name ?? 'Assignee'}
                              width={20}
                              height={20}
                              className="h-5 w-5 rounded-full border border-border/60 object-cover"
                            />
                          ) : (
                            <span className="flex h-5 w-5 items-center justify-center rounded-full border border-border/60 bg-muted/40 text-[10px] font-medium uppercase text-muted-foreground">
                              {selectedMember.user.name?.charAt(0) ?? '?'}
                            </span>
                          )}
                          <span className="truncate">
                            {selectedMember.user.name ?? 'Unknown member'}
                          </span>
                        </div>
                      );
                    })()}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all" className="text-xs">
                    Everyone
                  </SelectItem>
                  {eligibleAssignees.map((member) => (
                    <SelectItem key={member.id} value={member.id}>
                      <div className="flex items-center gap-2 text-xs">
                        {member.user.image ? (
                          <div className="flex h-6 w-6 items-center justify-center overflow-hidden rounded-full border border-border/60 bg-muted/40">
                            <Image
                              src={member.user.image}
                              alt={member.user.name ?? 'Assignee'}
                              width={24}
                              height={24}
                              className="h-full w-full object-cover"
                            />
                          </div>
                        ) : (
                          <span className="flex h-6 w-6 items-center justify-center rounded-full border border-border/60 bg-muted/40 text-[10px] font-medium uppercase text-muted-foreground">
                            {member.user.name?.charAt(0) ?? '?'}
                          </span>
                        )}
                        <span>{member.user.name ?? 'Unknown member'}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {/* Result Count */}
            {(searchQuery || statusFilter || assigneeFilter) && (
              <div className="text-muted-foreground text-xs tabular-nums whitespace-nowrap lg:ml-auto">
                {filteredTasks.length} {filteredTasks.length === 1 ? 'result' : 'results'}
              </div>
            )}
          </div>

          {/* Tabs - visible on all screens */}
          <TabsList className="w-full lg:w-auto text-xs">
            <TabsTrigger
              value="categories"
              className={`text-xs ${currentTab === 'categories' ? 'bg-primary' : ''} `}
            >
              <FolderTree className="h-2.5 w-2.5" />
              Categories
            </TabsTrigger>
            <TabsTrigger
              value="list"
              className={`text-xs ${currentTab === 'list' ? 'bg-primary' : ''} `}
            >
              <List className="h-2.5 w-2.5" />
              List
            </TabsTrigger>
          </TabsList>
        </div>
        <TabsContent value="categories" className="mt-6">
          <TasksByCategory tasks={filteredTasks} members={members} statusFilter={statusFilter} />
        </TabsContent>
        <TabsContent value="list" className="mt-6">
          <ModernTaskList tasks={filteredTasks} members={members} statusFilter={statusFilter} />
        </TabsContent>
      </Tabs>

      <CreateTaskSheet members={members} controls={controls} />
    </div>
  );
}
