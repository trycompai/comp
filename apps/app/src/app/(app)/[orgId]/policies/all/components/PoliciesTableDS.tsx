'use client';

import { StatusIndicator } from '@/components/status-indicator';
import { formatDate } from '@/lib/format';
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

interface PoliciesTableDSProps {
  policies: Policy[];
  sortColumn?: SortColumn;
  sortDirection?: 'asc' | 'desc';
  onSort?: (column: SortColumn) => void;
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
}: PoliciesTableDSProps) {
  const params = useParams<{ orgId: string }>();
  const router = useRouter();
  const orgId = params.orgId;

  const handleRowClick = (policyId: string) => {
    router.push(`/${orgId}/policies/${policyId}`);
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
          <PolicyRow key={policy.id} policy={policy} orgId={orgId} onRowClick={handleRowClick} />
        ))}
      </TableBody>
    </Table>
  );
}

interface PolicyRowProps {
  policy: Policy;
  orgId: string;
  onRowClick: (policyId: string) => void;
}

function PolicyRow({ policy, orgId, onRowClick }: PolicyRowProps) {
  const status = usePolicyTailoringStatus(policy.id);
  const isTailoring = status && ACTIVE_STATUSES.includes(status);

  return (
    <TableRow
      onClick={() => !isTailoring && onRowClick(policy.id)}
      style={{ cursor: isTailoring ? 'not-allowed' : 'pointer' }}
    >
      <TableCell>
        <PolicyNameCell policy={policy} orgId={orgId} isTailoring={isTailoring} />
      </TableCell>
      <TableCell>
        <PolicyStatusCell policy={policy} status={status} isTailoring={isTailoring} />
      </TableCell>
      <TableCell>
        <Badge variant="secondary">{policy.department}</Badge>
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
}

function PolicyNameCell({ policy, orgId, isTailoring }: PolicyNameCellProps) {
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
