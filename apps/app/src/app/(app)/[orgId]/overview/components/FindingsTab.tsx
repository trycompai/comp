'use client';

import {
  FINDING_SEVERITY_CONFIG,
  FINDING_STATUS_CONFIG,
  FINDING_TYPE_LABELS,
  useOrganizationFindings,
  type Finding,
} from '@/hooks/use-findings-api';
import { usePermissions } from '@/hooks/use-permissions';
import { formatDate } from '@/lib/format';
import { FindingStatus, FindingSeverity, FindingType } from '@db';
import {
  Badge,
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Text,
} from '@trycompai/design-system';
import { Search, WarningAlt } from '@trycompai/design-system/icons';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { CreateFindingSheet } from './CreateFindingSheet';
import { FindingDetailSheet } from './FindingDetailSheet';

const STATUS_OPTIONS: { value: FindingStatus | 'all'; label: string }[] = [
  { value: 'all', label: 'All statuses' },
  { value: FindingStatus.open, label: 'Open' },
  { value: FindingStatus.ready_for_review, label: 'Ready for review' },
  { value: FindingStatus.needs_revision, label: 'Needs revision' },
  { value: FindingStatus.closed, label: 'Closed' },
];

const SEVERITY_OPTIONS: { value: FindingSeverity | 'all'; label: string }[] = [
  { value: 'all', label: 'All severities' },
  { value: FindingSeverity.critical, label: 'Critical' },
  { value: FindingSeverity.high, label: 'High' },
  { value: FindingSeverity.medium, label: 'Medium' },
  { value: FindingSeverity.low, label: 'Low' },
];

const FRAMEWORK_OPTIONS: { value: FindingType | 'all'; label: string }[] = [
  { value: 'all', label: 'All frameworks' },
  { value: FindingType.soc2, label: FINDING_TYPE_LABELS.soc2 },
  { value: FindingType.iso27001, label: FINDING_TYPE_LABELS.iso27001 },
];

const capitalize = (s: string) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);

function targetLabel(f: Finding): string {
  if (f.task) return `Task: ${f.task.title}`;
  if (f.policy) return `Policy: ${f.policy.name}`;
  if (f.vendor) return `Vendor: ${f.vendor.name}`;
  if (f.risk) return `Risk: ${f.risk.title}`;
  if (f.member) return `Person: ${f.member.user.name ?? f.member.user.email}`;
  if (f.device) return `Device: ${f.device.name || f.device.hostname}`;
  if (f.evidenceSubmission)
    return `Document: ${f.evidenceSubmission.formType.replace(/-/g, ' ')}`;
  if (f.evidenceFormType) return `Document: ${f.evidenceFormType.replace(/-/g, ' ')}`;
  if (f.area === 'risks') return 'Risks (general)';
  if (f.area === 'vendors') return 'Vendors (general)';
  if (f.area === 'policies') return 'Policies (general)';
  if (f.area) return `Area: ${capitalize(f.area)}`;
  return '—';
}

const SEVERITY_VARIANT: Record<FindingSeverity, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  low: 'outline',
  medium: 'secondary',
  high: 'secondary',
  critical: 'destructive',
};

const STATUS_VARIANT: Record<FindingStatus, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  open: 'destructive',
  ready_for_review: 'outline',
  needs_revision: 'secondary',
  closed: 'default',
};

interface FindingsTabProps {
  organizationId: string;
  initialFindings?: Finding[];
  /** Controlled open state for the Create Finding sheet (owned by the page header). */
  createOpen?: boolean;
  onCreateOpenChange?: (open: boolean) => void;
}

export function FindingsTab({
  organizationId,
  initialFindings,
  createOpen: createOpenProp,
  onCreateOpenChange,
}: FindingsTabProps) {
  const [internalCreateOpen, setInternalCreateOpen] = useState(false);
  const createOpen = createOpenProp ?? internalCreateOpen;
  const setCreateOpen = onCreateOpenChange ?? setInternalCreateOpen;

  const [selectedFinding, setSelectedFinding] = useState<Finding | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<FindingStatus | 'all'>('all');
  const [severityFilter, setSeverityFilter] = useState<FindingSeverity | 'all'>('all');
  const [frameworkFilter, setFrameworkFilter] = useState<FindingType | 'all'>('all');

  const { hasPermission } = usePermissions();
  const canCreate = hasPermission('finding', 'create');

  const router = useRouter();
  const searchParams = useSearchParams();
  const openFindingId = searchParams?.get('open') ?? null;

  const { data, mutate } = useOrganizationFindings(
    {},
    initialFindings
      ? { fallbackData: { data: initialFindings, status: 200 } }
      : {},
  );
  const findings: Finding[] = Array.isArray(data?.data) ? data.data : [];

  // Support deep links (e.g. emails + in-app notifications) that land on
  // `/overview/findings?open=<id>`. Auto-open the matching finding's sheet
  // once we've loaded the list, then strip the query param so a page
  // refresh doesn't reopen it.
  useEffect(() => {
    if (!openFindingId) return;
    const match = findings.find((f) => f.id === openFindingId);
    if (!match) return;
    setSelectedFinding((current) => current ?? match);
    const params = new URLSearchParams(searchParams?.toString() ?? '');
    params.delete('open');
    const query = params.toString();
    router.replace(query ? `?${query}` : '?', { scroll: false });
  }, [openFindingId, findings, router, searchParams]);

  const filtered = useMemo(() => {
    let result = [...findings];

    if (statusFilter !== 'all') {
      result = result.filter((f) => f.status === statusFilter);
    }
    if (severityFilter !== 'all') {
      result = result.filter((f) => f.severity === severityFilter);
    }
    if (frameworkFilter !== 'all') {
      result = result.filter((f) => f.type === frameworkFilter);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (f) =>
          f.content.toLowerCase().includes(q) ||
          targetLabel(f).toLowerCase().includes(q),
      );
    }

    result.sort((a, b) => {
      const aTime = new Date(a.updatedAt).getTime();
      const bTime = new Date(b.updatedAt).getTime();
      return bTime - aTime;
    });

    return result;
  }, [findings, statusFilter, severityFilter, frameworkFilter, searchQuery]);

  const statusLabel =
    STATUS_OPTIONS.find((o) => o.value === statusFilter)?.label ?? 'Status';
  const severityLabel =
    SEVERITY_OPTIONS.find((o) => o.value === severityFilter)?.label ?? 'Severity';
  const frameworkLabel =
    FRAMEWORK_OPTIONS.find((o) => o.value === frameworkFilter)?.label ??
    'Framework';

  const hasAnyFinding = findings.length > 0;

  return (
    <Stack gap="md">
      {hasAnyFinding && (
        <div className="flex flex-col gap-3 md:flex-row md:items-end">
          <div className="w-full md:max-w-[300px]">
            <InputGroup>
              <InputGroupAddon>
                <Search size={16} />
              </InputGroupAddon>
              <InputGroupInput
                placeholder="Search findings..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </InputGroup>
          </div>
          <div className="flex gap-2">
            <div className="flex-1 md:w-[180px] md:flex-none">
              <Select
                value={statusFilter}
                onValueChange={(v) =>
                  setStatusFilter((v ?? 'all') as FindingStatus | 'all')
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Status">{statusLabel}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1 md:w-[180px] md:flex-none">
              <Select
                value={severityFilter}
                onValueChange={(v) =>
                  setSeverityFilter((v ?? 'all') as FindingSeverity | 'all')
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Severity">{severityLabel}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {SEVERITY_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1 md:w-[180px] md:flex-none">
              <Select
                value={frameworkFilter}
                onValueChange={(v) =>
                  setFrameworkFilter((v ?? 'all') as FindingType | 'all')
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Framework">{frameworkLabel}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {FRAMEWORK_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      )}

      {!hasAnyFinding ? (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <WarningAlt size={24} />
            </EmptyMedia>
            <EmptyTitle>No findings yet</EmptyTitle>
            <EmptyDescription>
              Findings are raised by your auditor when something in your compliance
              program needs attention. They&apos;ll show up here so your team can act
              on them.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : filtered.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyTitle>No findings match your filters</EmptyTitle>
            <EmptyDescription>
              Try clearing the search or changing the status/severity filter.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <Table variant="bordered">
          <TableHeader>
            <TableRow>
              <TableHead>Target</TableHead>
              <TableHead>Finding</TableHead>
              <TableHead>Severity</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Updated</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((f) => (
              <TableRow
                key={f.id}
                onClick={() => setSelectedFinding(f)}
                style={{ cursor: 'pointer' }}
              >
                <TableCell style={{ maxWidth: 360, width: 360 }}>
                  <span
                    className="block truncate text-sm text-muted-foreground"
                    style={{ maxWidth: 360 }}
                    title={targetLabel(f)}
                  >
                    {targetLabel(f)}
                  </span>
                </TableCell>
                <TableCell style={{ maxWidth: 360, width: 360 }}>
                  <span
                    className="block truncate text-sm font-medium"
                    style={{ maxWidth: 360 }}
                    title={f.content}
                  >
                    {f.content}
                  </span>
                </TableCell>
                <TableCell>
                  <Badge variant={SEVERITY_VARIANT[f.severity]}>
                    {FINDING_SEVERITY_CONFIG[f.severity].label}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge variant={STATUS_VARIANT[f.status]}>
                    {FINDING_STATUS_CONFIG[f.status].label}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Text size="sm" variant="muted">
                    {formatDate(f.updatedAt)}
                  </Text>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      {canCreate && (
        <CreateFindingSheet
          organizationId={organizationId}
          open={createOpen}
          onOpenChange={setCreateOpen}
          onSuccess={() => {
            void mutate();
          }}
        />
      )}

      <FindingDetailSheet
        finding={selectedFinding}
        organizationId={organizationId}
        open={selectedFinding !== null}
        onOpenChange={(o) => {
          if (!o) setSelectedFinding(null);
        }}
        onSaved={() => {
          void mutate();
        }}
        onDeleted={() => {
          void mutate();
        }}
      />
    </Stack>
  );
}
