'use client';

import type { Policy, PolicyStatus } from '@db';
import {
  HStack,
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
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

  const statusLabel = STATUS_OPTIONS.find((opt) => opt.value === statusFilter)?.label ?? 'Status';

  const capitalize = (str: string) => str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
  const departmentLabel =
    departmentFilter === 'all' ? 'All Departments' : capitalize(departmentFilter);

  return (
    <Stack gap="md">
      <div className="flex flex-col gap-3 md:flex-row md:items-end">
        {/* Search - full width on mobile, constrained on desktop */}
        <div className="w-full md:max-w-[300px]">
          <InputGroup>
            <InputGroupAddon>
              <Search size={16} />
            </InputGroupAddon>
            <InputGroupInput
              placeholder="Search policies..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </InputGroup>
        </div>
        {/* Filters - side by side on mobile, inline with search on desktop */}
        <div className="flex gap-2">
          <div className="flex-1 md:w-[160px] md:flex-none">
            <Select
              value={statusFilter}
              onValueChange={(v) => setStatusFilter((v ?? 'all') as PolicyStatus | 'all')}
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
          <div className="flex-1 md:w-[160px] md:flex-none">
            <Select value={departmentFilter} onValueChange={(v) => setDepartmentFilter(v ?? 'all')}>
              <SelectTrigger>
                <SelectValue placeholder="Department">{departmentLabel}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Departments</SelectItem>
                {departments.map((dept) => (
                  <SelectItem key={dept} value={dept}>
                    {capitalize(dept)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>
      <PoliciesTableDS
        policies={filteredPolicies}
        sortColumn={sortColumn}
        sortDirection={sortDirection}
        onSort={handleSort}
      />
    </Stack>
  );
}
