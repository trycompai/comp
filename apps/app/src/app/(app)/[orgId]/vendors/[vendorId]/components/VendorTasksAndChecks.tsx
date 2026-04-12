'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { CartesianGrid, Line, LineChart, XAxis, YAxis, Dot } from 'recharts';
import { Shimmer } from '@/components/ai-elements/shimmer';
import {
  useVendorIntegrations,
  useVendorIntegrationActions,
  useVendorCheckHistory,
  type CheckHistoryEntry,
} from '@/hooks/use-vendor-integrations';
import { useApi } from '@/hooks/use-api';
import { formatRelativeTime } from '@/utils/format-relative-time';
import { VendorConnectButton } from './VendorConnectButton';
import { usePermissions } from '@/hooks/use-permissions';
import {
  Badge,
  Button,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
  HStack,
  Spinner,
  Stack,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Text,
} from '@trycompai/design-system';
import {
  CheckmarkFilled,
  ErrorFilled,
  MagicWandFilled,
  Play,
  Connect,
  Download,
} from '@trycompai/design-system/icons';

interface VendorTasksAndChecksProps {
  vendorId: string;
}

export function VendorTasksAndChecks({ vendorId }: VendorTasksAndChecksProps) {
  const { connected, available, hasConnections, mutate: refreshIntegrations } =
    useVendorIntegrations(vendorId);
  const { runChecks, runSingleCheck, toggleCheck } = useVendorIntegrationActions();
  const { history, mutate: refreshHistory } = useVendorCheckHistory(vendorId);
  const { hasPermission } = usePermissions();
  const canUpdate = hasPermission('vendor', 'update');
  const [togglingCheckId, setTogglingCheckId] = useState<string | null>(null);
  const [runningCheckId, setRunningCheckId] = useState<string | null>(null);
  const [expandedCheckId, setExpandedCheckId] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Clean up polling on unmount
  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  const handleRunCheck = async ({
    connectionId,
    checkId,
  }: {
    connectionId: string;
    checkId: string;
  }) => {
    if (!canUpdate) return;
    setRunningCheckId(checkId);
    try {
      await runSingleCheck({ connectionId, checkId });
      toast.success('Check triggered');

      // Poll for updates every 3s for 30s
      if (pollRef.current) clearInterval(pollRef.current);
      let pollCount = 0;
      pollRef.current = setInterval(() => {
        void refreshIntegrations();
        void refreshHistory();
        pollCount++;
        if (pollCount >= 10 && pollRef.current) {
          clearInterval(pollRef.current);
          pollRef.current = null;
        }
      }, 3000);
    } catch {
      toast.error('Failed to run check');
    } finally {
      setRunningCheckId(null);
    }
  };

  const handleToggleCheck = async ({
    connectionId,
    checkId,
    enabled,
  }: {
    connectionId: string;
    checkId: string;
    enabled: boolean;
  }) => {
    if (!canUpdate) return;
    setTogglingCheckId(checkId);
    try {
      await toggleCheck({ vendorId, connectionId, checkId, enabled });
      await refreshIntegrations();
    } catch {
      toast.error('Failed to update check');
    } finally {
      setTogglingCheckId(null);
    }
  };

  const allChecks = connected.flatMap((integration) =>
    integration.checks.map((check) => ({
      ...check,
      connectionId: integration.connectionId,
      providerName: integration.providerName,
      providerSlug: integration.providerSlug,
    })),
  );

  if (!hasConnections) {
    // No integrations connected and none available — hide entirely
    if (available.length === 0) return null;

    return (
      <div className="rounded-md border border-dashed border-border bg-muted/30 px-4 py-6 text-center">
        <Stack gap="sm" align="center">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted">
            <Connect size={16} />
          </div>
          <Text size="sm" variant="muted">
            Connect an integration to enable automated checks
          </Text>
          <VendorConnectButton vendorId={vendorId} />
        </Stack>
      </div>
    );
  }

  return (
    <Stack gap="4">
      <HStack justify="between" align="center">
        <Text size="lg" weight="semibold">Integration Checks</Text>
        {canUpdate && <VendorConnectButton vendorId={vendorId} />}
      </HStack>
      <div className="[&_[data-slot=table-cell]]:whitespace-normal [&_[data-slot=table-scroll]]:overflow-visible [&_[data-slot=table-head]:nth-child(n+4)]:hidden [&_[data-slot=table-cell]:nth-child(n+4)]:hidden lg:[&_[data-slot=table-head]:nth-child(n+4)]:table-cell lg:[&_[data-slot=table-cell]:nth-child(n+4)]:table-cell">
      <Table variant="bordered">
        <TableHeader>
          <TableRow>
            <TableHead>STATUS</TableHead>
            <TableHead>CHECK</TableHead>
            <TableHead>LAST RUN</TableHead>
            {canUpdate && <TableHead>ENABLED</TableHead>}
            {canUpdate && <TableHead>ACTIONS</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {allChecks.map((check) => {
            const isExpanded = expandedCheckId === check.checkId;
            const checkHistory = history.filter((h) => h.checkId === check.checkId);

            return (
              <CheckTableRow
                key={`${check.connectionId}-${check.checkId}`}
                check={check}
                isExpanded={isExpanded}
                checkHistory={checkHistory}
                canUpdate={canUpdate}
                togglingCheckId={togglingCheckId}
                onToggle={() =>
                  setExpandedCheckId(isExpanded ? null : check.checkId)
                }
                onToggleCheck={handleToggleCheck}
                onRunCheck={handleRunCheck}
                runningCheckId={runningCheckId}
                vendorId={vendorId}
              />
            );
          })}
        </TableBody>
      </Table>
    </div>
    </Stack>
  );
}

// --- Check row with expandable history ---

interface CheckWithMeta {
  checkId: string;
  checkName: string;
  description: string;
  enabled: boolean;
  disabledReason: string | null;
  lastRun: {
    status: string;
    passedCount: number;
    failedCount: number;
    completedAt: string | null;
  } | null;
  connectionId: string;
  providerName: string;
}

function CheckTableRow({
  check,
  isExpanded,
  checkHistory,
  canUpdate,
  togglingCheckId,
  onToggle,
  onToggleCheck,
  onRunCheck,
  runningCheckId,
  vendorId,
}: {
  check: CheckWithMeta;
  isExpanded: boolean;
  checkHistory: CheckHistoryEntry[];
  canUpdate: boolean;
  togglingCheckId: string | null;
  onToggle: () => void;
  onRunCheck: (params: { connectionId: string; checkId: string }) => void;
  runningCheckId: string | null;
  onToggleCheck: (params: {
    connectionId: string;
    checkId: string;
    enabled: boolean;
  }) => void;
  vendorId: string;
}) {
  return (
    <>
      <TableRow onClick={onToggle} style={{ cursor: 'pointer' }}>
        <TableCell>
          <CheckStatusBadge check={check} />
        </TableCell>
        <TableCell>
          <Text size="sm" weight="medium">{check.checkName}</Text>
        </TableCell>
        <TableCell>
          <CheckLastRunCell check={check} />
        </TableCell>
        {canUpdate && (
          <TableCell>
            <div onClick={(e) => e.stopPropagation()}>
              <Switch
                size="sm"
                checked={check.enabled}
                disabled={togglingCheckId === check.checkId}
                onCheckedChange={(checked) =>
                  onToggleCheck({
                    connectionId: check.connectionId,
                    checkId: check.checkId,
                    enabled: checked,
                  })
                }
              />
            </div>
          </TableCell>
        )}
        {canUpdate && (
          <TableCell>
            <div onClick={(e) => e.stopPropagation()}>
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  onRunCheck({
                    connectionId: check.connectionId,
                    checkId: check.checkId,
                  })
                }
                disabled={!check.enabled || runningCheckId === check.checkId}
                loading={runningCheckId === check.checkId}
                iconLeft={<Play />}
              >
                Run
              </Button>
            </div>
          </TableCell>
        )}
      </TableRow>

      {isExpanded && (
        <tr className="border-b" data-slot="table-row">
          <TableCell colSpan={canUpdate ? 5 : 3}>
            <Stack gap="sm">
              <Text size="xs" variant="muted">{check.description}</Text>
              {check.lastRun && check.lastRun.failedCount > 0 && (
                <CheckFailureDetail
                  vendorId={vendorId}
                  connectionId={check.connectionId}
                  checkId={check.checkId}
                  checkName={check.checkName}
                />
              )}
              <CheckHistoryPanel
                checkHistory={checkHistory}
                checkName={check.checkName}
                vendorId={vendorId}
                checkId={check.checkId}
                connectionId={check.connectionId}
              />
            </Stack>
          </TableCell>
        </tr>
      )}
    </>
  );
}

// --- Failure detail with AI remediation ---

interface CheckResult {
  passed: boolean;
  resourceType: string;
  resourceId: string;
  title: string;
  description: string | null;
  severity: string | null;
  remediation: string | null;
}

function CheckFailureDetail({
  vendorId,
  connectionId,
  checkId,
  checkName,
}: {
  vendorId: string;
  connectionId: string;
  checkId: string;
  checkName: string;
}) {
  const api = useApi();
  const [failures, setFailures] = useState<CheckResult[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showRemediation, setShowRemediation] = useState(false);

  // Load failure details, then trigger AI stream
  useEffect(() => {
    async function load() {
      setIsLoading(true);
      try {
        const res = await api.get<{
          results: CheckResult[];
        }>(
          `/v1/vendors/${vendorId}/integrations/checks/${checkId}/detail?connectionId=${connectionId}`,
        );
        const data = res.data as unknown as { results?: CheckResult[] } | null;
        const failed = (data?.results ?? []).filter((r) => !r.passed);
        setFailures(failed);
        if (failed.length > 0) {
          setShowRemediation(true);
        }
      } catch {
        // Silently fail
      } finally {
        setIsLoading(false);
      }
    }
    void load();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vendorId, connectionId, checkId]);

  if (isLoading) {
    return <Shimmer duration={1.5}>Analyzing check failures...</Shimmer>;
  }

  if (failures.length === 0) return null;

  if (!showRemediation) return null;

  return (
    <RemediationStream
      vendorId={vendorId}
      connectionId={connectionId}
      checkId={checkId}
    />
  );
}

// --- AI Remediation Stream ---

function RemediationStream({
  vendorId,
  connectionId,
  checkId,
}: {
  vendorId: string;
  connectionId: string;
  checkId: string;
}) {
  const [text, setText] = useState('');
  const [isDone, setIsDone] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const api = useApi();
  const hasStarted = useRef(false);

  useEffect(() => {
    if (hasStarted.current) return;
    hasStarted.current = true;

    async function stream() {
      setIsStreaming(true);
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3333';
        const response = await fetch(
          `${apiUrl}/v1/vendors/${vendorId}/integrations/checks/${checkId}/remediation`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ connectionId }),
          },
        );

        if (!response.ok || !response.body) {
          setText('Unable to generate remediation.');
          setIsDone(true);
          setIsStreaming(false);
          return;
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let accumulated = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          accumulated += decoder.decode(value, { stream: true });
          setText(accumulated);
        }

        setIsDone(true);
      } catch {
        setText('Unable to generate remediation.');
        setIsDone(true);
      } finally {
        setIsStreaming(false);
      }
    }

    void stream();
  }, [vendorId, connectionId, checkId, api]);

  if (!text && isStreaming) {
    return <Shimmer duration={1.5}>Generating remediation steps...</Shimmer>;
  }

  if (!text) return null;

  // Strip markdown bold/italic since we render as plain text
  const cleanText = text.replace(/\*\*(.+?)\*\*/g, '$1').replace(/\*(.+?)\*/g, '$1');
  return (
    <Stack gap="xs">
      <div><Badge variant="default"><MagicWandFilled size={12} /> AI Suggested Fix</Badge></div>
      <Text size="xs" variant="muted" as="p" style={{ textWrap: 'balance' }}>{cleanText}</Text>
    </Stack>
  );
}

// --- History panel with line chart ---

const chartConfig = {
  status: {
    label: 'Status',
    color: 'var(--color-primary)',
  },
} satisfies ChartConfig;

function CheckHistoryPanel({
  checkHistory,
  checkName,
  vendorId,
  checkId,
  connectionId,
}: {
  checkHistory: CheckHistoryEntry[];
  checkName: string;
  vendorId: string;
  checkId: string;
  connectionId: string;
}) {
  // One data point per day: "Pass" or "Fail" based on the latest run that day
  const chartData = useMemo(() => {
    const byDay = new Map<string, 'pass' | 'fail' | null>();
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      byDay.set(d.toISOString().slice(0, 10), null);
    }

    const sorted = [...checkHistory].sort(
      (a, b) => new Date(a.completedAt).getTime() - new Date(b.completedAt).getTime(),
    );
    for (const entry of sorted) {
      if (!entry.completedAt) continue;
      const key = entry.completedAt.slice(0, 10);
      if (!byDay.has(key)) continue;
      byDay.set(key, entry.failedCount > 0 ? 'fail' : 'pass');
    }

    return Array.from(byDay.entries()).map(([date, status]) => ({
      date,
      label: formatDayLabel(date),
      value: status === 'pass' ? 1 : 0,
      statusLabel: status === 'pass' ? 'Pass' : status === 'fail' ? 'Fail' : 'No data',
      fill: status === 'pass' ? 'var(--color-primary)' : status === 'fail' ? 'var(--color-destructive)' : 'var(--color-muted-foreground)',
      hasData: status !== null,
    }));
  }, [checkHistory]);

  const [isExporting, setIsExporting] = useState(false);
  const api = useApi();

  const handleExportCsv = async () => {
    setIsExporting(true);
    try {
      // Fetch full history and current detail in parallel
      const [historyRes, detailRes] = await Promise.all([
        api.get<{ data: CheckHistoryEntry[] }>(
          `/v1/vendors/${vendorId}/integrations/checks/history`,
        ),
        api.get<{
          checkId: string;
          checkName: string;
          results: Array<{
            passed: boolean;
            resourceType: string;
            resourceId: string;
            title: string;
            description: string | null;
            severity: string | null;
            remediation: string | null;
          }>;
        }>(
          `/v1/vendors/${vendorId}/integrations/checks/${checkId}/detail?connectionId=${connectionId}`,
        ),
      ]);

      const fullHistory = Array.isArray(historyRes.data)
        ? historyRes.data
        : (historyRes.data as unknown as { data: CheckHistoryEntry[] })?.data ?? [];
      const filtered = fullHistory.filter((h) => h.checkId === checkId);

      const detail = detailRes.data as unknown as { results?: Array<{
        passed: boolean;
        resourceType: string;
        resourceId: string;
        title: string;
        description: string | null;
        severity: string | null;
        remediation: string | null;
      }> } | null;
      const results = detail?.results ?? [];

      // Escape CSV values
      const esc = (v: string | null | undefined) => {
        if (!v) return '';
        const s = String(v).replace(/"/g, '""');
        return s.includes(',') || s.includes('"') || s.includes('\n') ? `"${s}"` : s;
      };

      const lines: string[] = [];

      // Section 1: Run History
      lines.push('=== Run History ===');
      lines.push('Date,Check,Passed Count,Failed Count,Status');
      for (const h of filtered) {
        lines.push([esc(h.completedAt), esc(h.checkName), String(h.passedCount), String(h.failedCount), esc(h.status)].join(','));
      }

      // Section 2: Latest Results (evidence for auditors)
      lines.push('');
      lines.push('=== Latest Results ===');
      lines.push('Result,Resource Type,Resource ID,Title,Description,Severity,Remediation');
      for (const r of results) {
        lines.push([
          r.passed ? 'PASS' : 'FAIL',
          esc(r.resourceType),
          esc(r.resourceId),
          esc(r.title),
          esc(r.description),
          esc(r.severity),
          esc(r.remediation),
        ].join(','));
      }

      const csv = lines.join('\n');
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${checkId}-audit-report.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error('Failed to export history');
    } finally {
      setIsExporting(false);
    }
  };

  if (checkHistory.length === 0) {
    return (
      <div className="py-3 text-center">
        <Text size="sm" variant="muted">No check history available yet.</Text>
      </div>
    );
  }

  return (
    <Stack gap="sm">
      <HStack justify="between" align="center">
        <Text size="xs" weight="medium"><span className="select-none">7-Day History — {checkName}</span></Text>
        <Button
          variant="outline"
          size="xs"
          onClick={(e) => {
            e.stopPropagation();
            void handleExportCsv();
          }}
          disabled={isExporting}
          loading={isExporting}
          iconLeft={<Download />}
        >
          Export CSV
        </Button>
      </HStack>

      <div className="w-full select-none [&_[data-slot=chart]]:!aspect-auto [&_[data-slot=chart]]:h-36">
        <ChartContainer config={chartConfig}>
          <LineChart
            data={chartData}
            margin={{ top: 12, left: 0, right: 12, bottom: 0 }}
          >
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="label"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              fontSize={11}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              domain={[0, 1]}
              ticks={[0, 1]}
              tickFormatter={(v) => (v === 1 ? 'Pass' : 'Fail')}
              width={32}
              fontSize={11}
            />
            <ChartTooltip
              cursor={false}
              content={
                <ChartTooltipContent
                  hideIndicator
                  formatter={(value, _name, item) => (
                    <span>{(item.payload as { statusLabel: string }).statusLabel}</span>
                  )}
                />
              }
            />
            <Line
              dataKey="value"
              type="monotone"
              stroke="var(--color-status)"
              strokeWidth={2}
              connectNulls
              dot={({ payload, ...props }) => (
                <Dot
                  key={payload.date}
                  r={payload.hasData ? 5 : 3}
                  cx={props.cx}
                  cy={props.cy}
                  fill={payload.fill}
                  stroke={payload.fill}
                  opacity={payload.hasData ? 1 : 0.5}
                />
              )}
            />
          </LineChart>
        </ChartContainer>
      </div>
    </Stack>
  );
}

// --- Sub-components ---

function CheckStatusBadge({
  check,
}: {
  check: {
    enabled: boolean;
    lastRun: { status: string; passedCount: number; failedCount: number } | null;
  };
}) {
  if (!check.enabled) return <Badge variant="secondary">Disabled</Badge>;
  if (!check.lastRun) return <Badge variant="secondary">Pending</Badge>;
  if (check.lastRun.failedCount > 0) {
    return (
      <Badge variant="destructive">
        <ErrorFilled size={12} />
        Failing
      </Badge>
    );
  }
  return (
    <Badge variant="default">
      <CheckmarkFilled size={12} />
      Passing
    </Badge>
  );
}

function CheckLastRunCell({
  check,
}: {
  check: {
    lastRun: { completedAt: string | null } | null;
  };
}) {
  if (!check.lastRun?.completedAt) return <Text size="sm" variant="muted">—</Text>;

  return <Text size="sm" variant="muted">{formatRelativeTime(check.lastRun.completedAt)}</Text>;
}

// --- Helpers ---

function formatDayLabel(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}
