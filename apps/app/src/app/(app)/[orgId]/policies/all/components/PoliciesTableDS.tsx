'use client';

import { StatusIndicator } from '@/components/status-indicator';
import { formatDate } from '@/lib/format';
import { Checkbox } from '@comp/ui/checkbox';
import type { Policy } from '@db';
import {
  Badge,
  HStack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Text,
} from '@trycompai/design-system';
import { ArrowDown, ArrowUp, ArrowsVertical, Launch } from '@trycompai/design-system/icons';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { usePolicyTailoringStatus, type PolicyTailoringStatus } from './policy-tailoring-context';

type SortColumn = 'name' | 'status' | 'updatedAt';

const capitalize = (str: string) => str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();

interface PoliciesTableDSProps {
  policies: Policy[];
  sortColumn?: SortColumn;
  sortDirection?: 'asc' | 'desc';
  onSort?: (column: SortColumn) => void;
  selectable?: boolean;
  selectedIds?: Set<string>;
  onSelectionChange?: (ids: Set<string>) => void;
}

const ACTIVE_STATUSES: PolicyTailoringStatus[] = ['queued', 'pending', 'processing'];

function SortIcon({
  column,
  sortColumn,
  sortDirection,
}: {
  column: SortColumn;
  sortColumn?: SortColumn;
  sortDirection?: 'asc' | 'desc';
}) {
  if (sortColumn !== column) {
    return <ArrowsVertical size={14} className="text-muted-foreground opacity-50" />;
  }
  return sortDirection === 'asc' ? (
    <ArrowUp size={14} className="text-foreground" />
  ) : (
    <ArrowDown size={14} className="text-foreground" />
  );
}

export function PoliciesTableDS({
  policies,
  sortColumn,
  sortDirection,
  onSort,
  selectable = false,
  selectedIds,
  onSelectionChange,
}: PoliciesTableDSProps) {
  const params = useParams<{ orgId: string }>();
  const router = useRouter();
  const orgId = params.orgId;

  const handleSelectOne = (policyId: string) => {
    if (!onSelectionChange || !selectedIds) return;
    const next = new Set(selectedIds);
    if (next.has(policyId)) {
      next.delete(policyId);
    } else {
      next.add(policyId);
    }
    onSelectionChange(next);
  };

  const handleRowClick = (policyId: string) => {
    if (selectable) {
      handleSelectOne(policyId);
    } else {
      router.push(`/${orgId}/policies/${policyId}`);
    }
  };

  if (policies.length === 0) {
    return (
      <div className="flex h-32 items-center justify-center">
        <Text variant="muted">No policies found.</Text>
      </div>
    );
  }

  return (
    <Table variant="bordered">
      <TableHeader>
        <TableRow>
          {selectable && <TableHead style={{ width: 40 }} />}
          <TableHead>
            <HStack
              gap="xs"
              align="center"
              style={{ cursor: onSort ? 'pointer' : 'default' }}
              onClick={() => onSort?.('name')}
            >
              <span>Policy Name</span>
              {onSort && (
                <SortIcon column="name" sortColumn={sortColumn} sortDirection={sortDirection} />
              )}
            </HStack>
          </TableHead>
          <TableHead>
            <HStack
              gap="xs"
              align="center"
              style={{ cursor: onSort ? 'pointer' : 'default' }}
              onClick={() => onSort?.('status')}
            >
              <span>Status</span>
              {onSort && (
                <SortIcon column="status" sortColumn={sortColumn} sortDirection={sortDirection} />
              )}
            </HStack>
          </TableHead>
          <TableHead>Department</TableHead>
          <TableHead>
            <HStack
              gap="xs"
              align="center"
              style={{ cursor: onSort ? 'pointer' : 'default' }}
              onClick={() => onSort?.('updatedAt')}
            >
              <span>Last Updated</span>
              {onSort && (
                <SortIcon
                  column="updatedAt"
                  sortColumn={sortColumn}
                  sortDirection={sortDirection}
                />
              )}
            </HStack>
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {policies.map((policy) => (
          <PolicyRow
            key={policy.id}
            policy={policy}
            orgId={orgId}
            onRowClick={handleRowClick}
            selectable={selectable}
            selected={selectedIds?.has(policy.id) ?? false}
            onSelect={handleSelectOne}
          />
        ))}
      </TableBody>
    </Table>
  );
}

interface PolicyRowProps {
  policy: Policy;
  orgId: string;
  onRowClick: (policyId: string) => void;
  selectable: boolean;
  selected: boolean;
  onSelect: (policyId: string) => void;
}

function PolicyRow({ policy, orgId, onRowClick, selectable, selected, onSelect }: PolicyRowProps) {
  const status = usePolicyTailoringStatus(policy.id);
  const isTailoring = status && ACTIVE_STATUSES.includes(status);

  return (
    <TableRow
      onClick={() => !isTailoring && onRowClick(policy.id)}
      style={{ cursor: isTailoring ? 'not-allowed' : 'pointer' }}
      data-state={selected ? 'selected' : undefined}
    >
      {selectable && (
        <TableCell>
          <Checkbox
            checked={selected}
            onCheckedChange={() => onSelect(policy.id)}
            onClick={(e) => e.stopPropagation()}
            aria-label={`Select ${policy.name}`}
          />
        </TableCell>
      )}
      <TableCell>
        <PolicyNameCell policy={policy} orgId={orgId} isTailoring={isTailoring} selectable={selectable} />
      </TableCell>
      <TableCell>
        <PolicyStatusCell policy={policy} status={status} isTailoring={isTailoring} />
      </TableCell>
      <TableCell>
        <Badge variant="secondary">{policy.department ? capitalize(policy.department) : '—'}</Badge>
      </TableCell>
      <TableCell>
        <Text size="sm" variant="muted">
          {formatDate(policy.updatedAt)}
        </Text>
      </TableCell>
    </TableRow>
  );
}

interface PolicyNameCellProps {
  policy: Policy;
  orgId: string;
  isTailoring: boolean | undefined;
  selectable?: boolean;
}

function PolicyNameCell({ policy, orgId, isTailoring, selectable }: PolicyNameCellProps) {
  const policyHref = `/${orgId}/policies/${policy.id}`;

  if (isTailoring) {
    return (
      <HStack gap="xs" align="center">
        <div className="size-3 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        <Text size="sm" variant="muted">
          {policy.name}
        </Text>
      </HStack>
    );
  }

  if (selectable) {
    return (
      <Text size="sm" weight="medium">
        {policy.name}
      </Text>
    );
  }

  return (
    <Link
      href={policyHref}
      onClick={(e) => e.stopPropagation()}
      className="group flex items-center gap-2"
    >
      <Text size="sm" weight="medium">
        {policy.name}
      </Text>
      <Launch
        size={16}
        className="shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100"
      />
    </Link>
  );
}

interface PolicyStatusCellProps {
  policy: Policy;
  status: PolicyTailoringStatus | undefined;
  isTailoring: boolean | undefined;
}

function PolicyStatusCell({ policy, status, isTailoring }: PolicyStatusCellProps) {
  if (isTailoring) {
    const label =
      status === 'processing' ? 'Tailoring' : status === 'queued' ? 'Queued' : 'Preparing';

    return (
      <HStack gap="xs" align="center">
        <div className="size-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        <Text size="sm" variant="primary">
          {label}
        </Text>
      </HStack>
    );
  }

  return <StatusIndicator status={policy.status} />;
}
