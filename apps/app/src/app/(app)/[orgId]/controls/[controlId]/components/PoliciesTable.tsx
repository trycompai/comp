'use client';

import { StatusIndicator } from '@/components/status-indicator';
import { Policy } from '@db';
import { InputGroup, InputGroupAddon, InputGroupInput } from '@trycompai/design-system';
import { Search } from '@trycompai/design-system/icons';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Text,
} from '@trycompai/design-system';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';

interface PoliciesTableProps {
  policies: Policy[];
  orgId: string;
}

export function PoliciesTable({ policies, orgId }: PoliciesTableProps) {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState('');

  const filteredPolicies = useMemo(() => {
    if (!searchTerm.trim()) return policies;

    const searchLower = searchTerm.toLowerCase();
    return policies.filter(
      (policy) =>
        (policy.name && policy.name.toLowerCase().includes(searchLower)) ||
        (policy.id && policy.id.toLowerCase().includes(searchLower)),
    );
  }, [policies, searchTerm]);

  const handleRowClick = (policyId: string) => {
    router.push(`/${orgId}/policies/${policyId}`);
  };

  return (
    <div className="space-y-4">
      <div className="w-full max-w-sm">
        <InputGroup>
          <InputGroupAddon>
            <Search size={16} />
          </InputGroupAddon>
          <InputGroupInput
            placeholder="Search policies..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </InputGroup>
      </div>

      <Table variant="bordered">
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Created At</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filteredPolicies.length === 0 ? (
            <TableRow>
              <TableCell colSpan={3}>
                <Text size="sm" variant="muted">
                  No policies found.
                </Text>
              </TableCell>
            </TableRow>
          ) : (
            filteredPolicies.map((policy) => (
              <TableRow
                key={policy.id}
                role="button"
                tabIndex={0}
                onClick={() => handleRowClick(policy.id)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    handleRowClick(policy.id);
                  }
                }}
              >
                <TableCell>{policy.name}</TableCell>
                <TableCell>{new Date(policy.createdAt).toLocaleDateString()}</TableCell>
                <TableCell>
                  <StatusIndicator status={policy.status} />
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
