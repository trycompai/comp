'use client';

import {
  Badge,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  TableCell,
  TableRow,
  Text,
} from '@trycompai/design-system';
import { Edit, OverflowMenuVertical, TrashCan } from '@trycompai/design-system/icons';

export interface AdminFinding {
  id: string;
  type: string;
  status: string;
  severity: string;
  content: string;
  area: string | null;
  createdAt: string;
  createdBy?: { user?: { name: string; email: string } } | null;
  createdByAdmin?: { name: string; email: string } | null;
  task?: { id: string; title: string } | null;
  evidenceSubmission?: { id: string; formType: string } | null;
  evidenceFormType?: string | null;
  policy?: { id: string; name: string } | null;
  vendor?: { id: string; name: string } | null;
  risk?: { id: string; title: string } | null;
  member?: { id: string; user: { name: string; email: string } } | null;
  device?: { id: string; name: string; hostname: string } | null;
}

const STATUS_OPTIONS = ['open', 'ready_for_review', 'needs_revision', 'closed'];

const STATUS_VARIANT: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  open: 'destructive',
  ready_for_review: 'outline',
  needs_revision: 'secondary',
  closed: 'default',
};

const SEVERITY_VARIANT: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  low: 'outline',
  medium: 'secondary',
  high: 'secondary',
  critical: 'destructive',
};

function formatStatus(status: string) {
  return status.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function getCreatorName(finding: AdminFinding): string {
  return (
    finding.createdBy?.user?.name ||
    finding.createdBy?.user?.email ||
    finding.createdByAdmin?.name ||
    finding.createdByAdmin?.email ||
    'Unknown'
  );
}

export function getTargetLabel(f: AdminFinding): string {
  if (f.task) return `Task: ${f.task.title}`;
  if (f.policy) return `Policy: ${f.policy.name}`;
  if (f.vendor) return `Vendor: ${f.vendor.name}`;
  if (f.risk) return `Risk: ${f.risk.title}`;
  if (f.member) return `Person: ${f.member.user.name || f.member.user.email}`;
  if (f.device) return `Device: ${f.device.name || f.device.hostname}`;
  if (f.evidenceSubmission) return `Evidence: ${f.evidenceSubmission.formType}`;
  if (f.evidenceFormType) return `Form: ${f.evidenceFormType}`;
  if (f.area) return `Area: ${f.area}`;
  return '—';
}

interface AdminFindingRowProps {
  finding: AdminFinding;
  statusUpdating: boolean;
  onStatusChange: (findingId: string, newStatus: string) => void;
  onEdit: (finding: AdminFinding) => void;
  onDelete: (finding: AdminFinding) => void;
}

export function AdminFindingRow({
  finding,
  statusUpdating,
  onStatusChange,
  onEdit,
  onDelete,
}: AdminFindingRowProps) {
  return (
    <TableRow>
      <TableCell>
        <div className="max-w-[400px] truncate">
          <Text size="sm">{finding.content}</Text>
        </div>
      </TableCell>
      <TableCell>
        <Text size="sm" variant="muted">
          {getTargetLabel(finding)}
        </Text>
      </TableCell>
      <TableCell>
        <Badge variant={SEVERITY_VARIANT[finding.severity] ?? 'secondary'}>
          {finding.severity}
        </Badge>
      </TableCell>
      <TableCell>
        <Text size="sm" variant="muted">
          {getCreatorName(finding)}
        </Text>
      </TableCell>
      <TableCell>
        <Select
          value={finding.status}
          onValueChange={(val) => {
            if (val) onStatusChange(finding.id, val);
          }}
          disabled={statusUpdating}
        >
          <SelectTrigger size="sm">
            <Badge variant={STATUS_VARIANT[finding.status] ?? 'default'}>
              {formatStatus(finding.status)}
            </Badge>
          </SelectTrigger>
          <SelectContent alignItemWithTrigger={false}>
            {STATUS_OPTIONS.map((s) => (
              <SelectItem key={s} value={s}>
                {formatStatus(s)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </TableCell>
      <TableCell>
        <div className="flex justify-center">
          <DropdownMenu>
            <DropdownMenuTrigger
              aria-label="Finding actions"
              className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <OverflowMenuVertical />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onEdit(finding)}>
                <Edit size={16} className="mr-2" />
                <span>Edit</span>
              </DropdownMenuItem>
              <DropdownMenuItem
                variant="destructive"
                onClick={() => onDelete(finding)}
              >
                <TrashCan size={16} className="mr-2" />
                <span>Delete</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </TableCell>
    </TableRow>
  );
}
