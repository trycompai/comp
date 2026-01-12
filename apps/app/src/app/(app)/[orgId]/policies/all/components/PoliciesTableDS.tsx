'use client';

import { StatusIndicator } from '@/components/status-indicator';
import { formatDate } from '@/lib/format';
import type { Policy } from '@db';
import {
  Badge,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Text,
} from '@trycompai/design-system';
import { ExternalLink, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { usePolicyTailoringStatus, type PolicyTailoringStatus } from './policy-tailoring-context';

interface PoliciesTableDSProps {
  policies: Policy[];
}

const ACTIVE_STATUSES: PolicyTailoringStatus[] = ['queued', 'pending', 'processing'];

export function PoliciesTableDS({ policies }: PoliciesTableDSProps) {
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
          <TableHead>Policy Name</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Department</TableHead>
          <TableHead>Last Updated</TableHead>
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
      <div className="flex items-center gap-2">
        <Loader2 className="size-3 animate-spin text-primary" />
        <Text size="sm" variant="muted">
          {policy.name}
        </Text>
      </div>
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
      <ExternalLink className="size-4 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
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
      <div className="flex items-center gap-2 text-sm text-primary">
        <Loader2 className="h-4 w-4 animate-spin" />
        {label}
      </div>
    );
  }

  return <StatusIndicator status={policy.status} />;
}
