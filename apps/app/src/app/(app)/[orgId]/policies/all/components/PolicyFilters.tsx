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
import { Loader2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { usePolicyOnboardingStatus } from '../../(overview)/hooks/use-policy-onboarding-status';
import { PoliciesTableDS } from './PoliciesTableDS';
import { PolicyTailoringProvider } from './policy-tailoring-context';
import { comparePoliciesByName } from './policy-name-sort';

interface PolicyFiltersProps {
  policies: Policy[];
  onboardingRunId?: string | null;
}

const STATUS_OPTIONS: { value: PolicyStatus | 'all' | 'archived'; label: string }[] = [
  { value: 'all', label: 'All Statuses' },
  { value: 'draft', label: 'Draft' },
  { value: 'published', label: 'Published' },
  { value: 'needs_review', label: 'Needs Review' },
  { value: 'archived', label: 'Archived' },
];

export function PolicyFilters({ policies, onboardingRunId }: PolicyFiltersProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<PolicyStatus | 'all' | 'archived'>('all');
  const [departmentFilter, setDepartmentFilter] = useState<string>('all');
  const [sortColumn, setSortColumn] = useState<'name' | 'status' | 'updatedAt'>('name');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  // ENG-108: subscribe to the onboarding run so PoliciesTableDS can surface
  // per-row "Tailoring/Queued/Preparing" state and we can render the banner
  // while AI is still personalizing the policy pack. Mirrors the existing
  // pattern in RisksTable/VendorsTable.
  const { itemStatuses, progress, isActive } = usePolicyOnboardingStatus(onboardingRunId);
  const hasActivePolicies = policies.length > 0;
  const showTailoringBanner = isActive && hasActivePolicies && progress !== null;

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
    if (statusFilter === 'archived') {
      result = result.filter((p) => p.isArchived);
    } else {
      result = result.filter((p) => !p.isArchived);
      if (statusFilter !== 'all') {
        result = result.filter((p) => p.status === statusFilter);
      }
    }

    // Department filter
    if (departmentFilter !== 'all') {
      result = result.filter((p) => p.department === departmentFilter);
    }

    // Sort
    result.sort((a, b) => {
      let comparison = 0;
      if (sortColumn === 'name') {
        comparison = comparePoliciesByName(a, b);
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

  const formatDepartment = (str: string) => str.toUpperCase();
  const departmentLabel =
    departmentFilter === 'all' ? 'All Departments' : formatDepartment(departmentFilter);

  return (
    <PolicyTailoringProvider statuses={itemStatuses}>
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
                onValueChange={(v) => setStatusFilter((v ?? 'all') as PolicyStatus | 'all' | 'archived')}
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
                      {formatDepartment(dept)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
        {showTailoringBanner && progress !== null && (
          <div className="flex items-center gap-3 rounded-xl border border-primary/20 bg-linear-to-r from-primary/10 via-primary/5 to-transparent px-4 py-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/15 text-primary">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-medium text-primary">Tailoring your policies</span>
              <span className="text-xs text-muted-foreground">
                Personalized {progress.completed}/{progress.total} policies
              </span>
            </div>
          </div>
        )}
        <PoliciesTableDS
          policies={filteredPolicies}
          sortColumn={sortColumn}
          sortDirection={sortDirection}
          onSort={handleSort}
        />
      </Stack>
    </PolicyTailoringProvider>
  );
}
