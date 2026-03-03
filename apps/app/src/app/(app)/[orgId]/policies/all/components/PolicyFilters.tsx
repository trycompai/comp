'use client';

import { usePolicyActions } from '@/hooks/use-policies';
import { Checkbox } from '@comp/ui/checkbox';
import type { Policy, PolicyStatus } from '@db';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  Button,
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
import { Close, Edit, Search, TrashCan } from '@trycompai/design-system/icons';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
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
  const [selectable, setSelectable] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  const { bulkDelete } = usePolicyActions();
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (!selectable) {
      setSelectedIds(new Set());
    }
  }, [selectable]);

  const departments = useMemo(() => {
    const depts = new Set<string>();
    policies.forEach((p) => {
      if (p.department) depts.add(p.department);
    });
    return Array.from(depts).sort();
  }, [policies]);

  const filteredPolicies = useMemo(() => {
    let result = [...policies];

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter((p) => p.name.toLowerCase().includes(query));
    }

    if (statusFilter !== 'all') {
      result = result.filter((p) => p.status === statusFilter);
    }

    if (departmentFilter !== 'all') {
      result = result.filter((p) => p.department === departmentFilter);
    }

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

  // Remove stale selections when filtered list changes
  useEffect(() => {
    const visibleIds = new Set(filteredPolicies.map((p) => p.id));
    setSelectedIds((prev) => {
      const next = new Set([...prev].filter((id) => visibleIds.has(id)));
      return next.size === prev.size ? prev : next;
    });
  }, [filteredPolicies]);

  const allSelected =
    filteredPolicies.length > 0 && filteredPolicies.every((p) => selectedIds.has(p.id));
  const someSelected =
    filteredPolicies.some((p) => selectedIds.has(p.id)) && !allSelected;
  const selectAllChecked = allSelected ? true : someSelected ? 'indeterminate' : false;

  const handleSelectAllChange = (checked: boolean | 'indeterminate') => {
    if (checked === true) {
      setSelectedIds(new Set(filteredPolicies.map((p) => p.id)));
    } else {
      setSelectedIds(new Set());
    }
  };

  const handleSelectionChange = (ids: Set<string>) => {
    setSelectedIds(ids);
  };

  const handleSort = (column: 'name' | 'status' | 'updatedAt') => {
    if (sortColumn === column) {
      setSortDirection((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  const handleBulkDelete = async () => {
    setIsDeleting(true);
    try {
      const result = await bulkDelete(Array.from(selectedIds));
      toast.success(
        `Deleted ${result.deletedCount} ${result.deletedCount === 1 ? 'policy' : 'policies'}`,
      );
      setSelectedIds(new Set());
      setSelectable(false);
      setIsDeleteDialogOpen(false);
    } catch {
      toast.error('Failed to delete policies');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleExitEditMode = () => {
    setSelectable(false);
    setSelectedIds(new Set());
  };

  const statusLabel = STATUS_OPTIONS.find((opt) => opt.value === statusFilter)?.label ?? 'Status';

  const capitalize = (str: string) => str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
  const departmentLabel =
    departmentFilter === 'all' ? 'All Departments' : capitalize(departmentFilter);

  const selectionCount = selectedIds.size;

  return (
    <Stack gap="md">
      {/* Filters bar -- always visible */}
      <div className="flex flex-col gap-3 md:flex-row md:items-end">
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
            <Select
              value={departmentFilter}
              onValueChange={(v) => setDepartmentFilter(v ?? 'all')}
            >
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
        <div className="ml-auto flex items-center gap-2">
          {selectable ? (
            <>
              <span className="text-xs text-muted-foreground">
                {selectionCount} item{selectionCount !== 1 ? 's' : ''} selected
              </span>
              <button
                type="button"
                onClick={handleExitEditMode}
                className="rounded p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <Close size={16} />
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => setSelectable(true)}
              className="rounded p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              <Edit size={16} />
            </button>
          )}
        </div>
      </div>

      {/* Bulk action bar -- only visible in edit mode */}
      {selectable && (
        <div className="flex items-center gap-4 rounded-lg border border-border/60 bg-card p-4">
          <Checkbox
            checked={selectAllChecked}
            onCheckedChange={handleSelectAllChange}
            aria-label="Select all policies"
          />
          <span className="text-sm text-muted-foreground">Select all</span>
          <div className="ml-auto flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsDeleteDialogOpen(true)}
              disabled={selectionCount === 0}
            >
              <TrashCan size={14} />
              <span>Delete</span>
            </Button>
          </div>
        </div>
      )}

      <PoliciesTableDS
        policies={filteredPolicies}
        sortColumn={sortColumn}
        sortDirection={sortDirection}
        onSort={handleSort}
        selectable={selectable}
        selectedIds={selectedIds}
        onSelectionChange={handleSelectionChange}
      />

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Delete {selectionCount} {selectionCount === 1 ? 'Policy' : 'Policies'}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the selected{' '}
              {selectionCount === 1 ? 'policy' : 'policies'} and all associated versions and PDF
              files. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBulkDelete}
              variant="destructive"
              loading={isDeleting}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Stack>
  );
}
