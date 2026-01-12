'use client';

import type { Policy, PolicyStatus } from '@db';
import {
  HStack,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Stack,
} from '@trycompai/design-system';
import { Search } from '@trycompai/design-system/icons';
import { useMemo, useState } from 'react';
import { PoliciesTableDS } from './PoliciesTableDS';

interface PolicyFiltersProps {
  policies: Policy[];
}

const STATUS_OPTIONS: { value: PolicyStatus | 'all'; label: string }[] = [
  { value: 'all', label: 'All Statuses' },
  { value: 'draft', label: 'Draft' },
  { value: 'published', label: 'Published' },
  { value: 'needs_review', label: 'Needs Review' },
];

export function PolicyFilters({ policies }: PolicyFiltersProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<PolicyStatus | 'all'>('all');
  const [departmentFilter, setDepartmentFilter] = useState<string>('all');
  const [sortColumn, setSortColumn] = useState<'name' | 'status' | 'updatedAt'>('updatedAt');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  // Get unique departments from policies
  const departments = useMemo(() => {
    const depts = new Set<string>();
    policies.forEach((p) => {
      if (p.department) depts.add(p.department);
    });
    return Array.from(depts).sort();
  }, [policies]);

  // Filter and sort policies
  const filteredPolicies = useMemo(() => {
    let result = [...policies];

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter((p) => p.name.toLowerCase().includes(query));
    }

    // Status filter
    if (statusFilter !== 'all') {
      result = result.filter((p) => p.status === statusFilter);
    }

    // Department filter
    if (departmentFilter !== 'all') {
      result = result.filter((p) => p.department === departmentFilter);
    }

    // Sort
    result.sort((a, b) => {
      let comparison = 0;
      if (sortColumn === 'name') {
        comparison = a.name.localeCompare(b.name);
      } else if (sortColumn === 'status') {
        comparison = a.status.localeCompare(b.status);
      } else if (sortColumn === 'updatedAt') {
        comparison = new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime();
      }
      return sortDirection === 'asc' ? comparison : -comparison;
    });

    return result;
  }, [policies, searchQuery, statusFilter, departmentFilter, sortColumn, sortDirection]);

  const handleSort = (column: 'name' | 'status' | 'updatedAt') => {
    if (sortColumn === column) {
      setSortDirection((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  return (
    <Stack gap="md">
      <HStack gap="sm" align="end">
        <div style={{ flex: 1, maxWidth: 300 }}>
          <div className="relative">
            <Search size={16} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search policies..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ paddingLeft: 32 }}
            />
          </div>
        </div>
        <div style={{ width: 160 }}>
          <Select value={statusFilter} onValueChange={(v) => setStatusFilter((v ?? 'all') as PolicyStatus | 'all')}>
            <SelectTrigger>
              <SelectValue placeholder="Status" />
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
        <div style={{ width: 160 }}>
          <Select value={departmentFilter} onValueChange={(v) => setDepartmentFilter(v ?? 'all')}>
            <SelectTrigger>
              <SelectValue placeholder="Department" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Departments</SelectItem>
              {departments.map((dept) => (
                <SelectItem key={dept} value={dept}>
                  {dept}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </HStack>
      <PoliciesTableDS
        policies={filteredPolicies}
        sortColumn={sortColumn}
        sortDirection={sortDirection}
        onSort={handleSort}
      />
    </Stack>
  );
}
