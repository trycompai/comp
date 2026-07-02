'use client';

import {
  Badge,
  Popover,
  PopoverContent,
  PopoverTrigger,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@trycompai/design-system';
import { Close, Filter } from '@trycompai/design-system/icons';

import { format } from 'date-fns';

import { DateRangeFilter } from './DateRangeFilter';

const STATUS_LABELS: Record<string, string> = {
  all: 'All People',
  active: 'Active',
  pending: 'Pending',
  deactivated: 'Deactivated',
};
const ROLE_LABELS: Record<string, string> = {
  owner: 'Owner',
  admin: 'Admin',
  auditor: 'Auditor',
  employee: 'Employee',
  contractor: 'Contractor',
};

function rangeLabel(from: Date | undefined, to: Date | undefined): string {
  if (from && to) return `${format(from, 'MMM d')} – ${format(to, 'MMM d')}`;
  if (from) return `from ${format(from, 'MMM d')}`;
  return `until ${format(to as Date, 'MMM d')}`;
}

/** Removable chip for one applied filter — clearable without opening the popover. */
function FilterChip({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <span className="flex h-8 items-center gap-1.5 whitespace-nowrap rounded-md border border-border bg-muted/40 px-2 text-xs">
      {label}
      <button
        type="button"
        aria-label={`Remove filter: ${label}`}
        onClick={onRemove}
        className="text-muted-foreground transition-colors hover:text-foreground"
      >
        <Close size={12} />
      </button>
    </span>
  );
}

interface PeopleFiltersProps {
  statusFilter: string;
  hasOffboardFilter: boolean;
  onStatusChange: (value: string | null) => void;
  roleFilter: string;
  onRoleChange: (value: string | null) => void;
  onboardFrom: Date | undefined;
  onboardTo: Date | undefined;
  onOnboardApply: (from: Date | undefined, to: Date | undefined) => void;
  onOnboardClear: () => void;
  offboardFrom: Date | undefined;
  offboardTo: Date | undefined;
  onOffboardApply: (from: Date | undefined, to: Date | undefined) => void;
  onOffboardClear: () => void;
}

/**
 * All People-list filters behind one funnel button: Status, Role, and the
 * Onboarded/Offboarded date ranges. The trigger shows how many filters are
 * active so a filtered list is never a mystery.
 */
export function PeopleFilters({
  statusFilter,
  hasOffboardFilter,
  onStatusChange,
  roleFilter,
  onRoleChange,
  onboardFrom,
  onboardTo,
  onOnboardApply,
  onOnboardClear,
  offboardFrom,
  offboardTo,
  onOffboardApply,
  onOffboardClear,
}: PeopleFiltersProps) {
  const activeCount = [
    statusFilter,
    roleFilter,
    onboardFrom || onboardTo,
    offboardFrom || offboardTo,
  ].filter(Boolean).length;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Popover>
      {/* PopoverTrigger renders its own <button>; a styled div inside (same
          pattern as the date chips) avoids invalid nested buttons. */}
      <PopoverTrigger>
        <div className="border-border bg-background hover:bg-muted flex h-8 cursor-pointer items-center gap-2 whitespace-nowrap rounded-md border px-3 text-sm transition-colors">
          <Filter size={16} className="text-muted-foreground" />
          Filters
          {activeCount > 0 && <Badge variant="accent">{activeCount}</Badge>}
        </div>
      </PopoverTrigger>
      <PopoverContent align="start" style={{ width: 'auto' }}>
        <div className="flex w-[280px] flex-col gap-4 p-1.5">
          <div className="flex flex-col gap-1">
            <span id="people-status-filter-label" className="text-xs text-muted-foreground">
              Status
            </span>
            <Select value={statusFilter || undefined} onValueChange={onStatusChange}>
              <SelectTrigger aria-labelledby="people-status-filter-label">
                <SelectValue placeholder="Active">
                  {hasOffboardFilter && !statusFilter
                    ? 'All People'
                    : ({ all: 'All People', active: 'Active', pending: 'Pending', deactivated: 'Deactivated' }[
                        statusFilter
                      ] ?? 'Active')}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All People</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="deactivated">Deactivated</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-1">
            <span id="people-role-filter-label" className="text-xs text-muted-foreground">
              Role
            </span>
            <Select value={roleFilter || undefined} onValueChange={onRoleChange}>
              <SelectTrigger aria-labelledby="people-role-filter-label">
                <SelectValue placeholder="All Roles">
                  {{ owner: 'Owner', admin: 'Admin', auditor: 'Auditor', employee: 'Employee', contractor: 'Contractor' }[
                    roleFilter
                  ] ?? 'All Roles'}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                <SelectItem value="owner">Owner</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="auditor">Auditor</SelectItem>
                <SelectItem value="employee">Employee</SelectItem>
                <SelectItem value="contractor">Contractor</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <DateRangeFilter
            label="Onboarded"
            from={onboardFrom}
            to={onboardTo}
            onApply={onOnboardApply}
            onClear={onOnboardClear}
          />
          <DateRangeFilter
            label="Offboarded"
            from={offboardFrom}
            to={offboardTo}
            onApply={onOffboardApply}
            onClear={onOffboardClear}
          />
        </div>
      </PopoverContent>
      </Popover>

      {/* Applied filters as removable chips — visible + one-click clearable
          without reopening the popover. */}
      {statusFilter && (
        <FilterChip
          label={`Status: ${STATUS_LABELS[statusFilter] ?? statusFilter}`}
          onRemove={() => onStatusChange(null)}
        />
      )}
      {roleFilter && (
        <FilterChip
          label={`Role: ${ROLE_LABELS[roleFilter] ?? roleFilter}`}
          onRemove={() => onRoleChange('all')}
        />
      )}
      {(onboardFrom || onboardTo) && (
        <FilterChip
          label={`Onboarded ${rangeLabel(onboardFrom, onboardTo)}`}
          onRemove={onOnboardClear}
        />
      )}
      {(offboardFrom || offboardTo) && (
        <FilterChip
          label={`Offboarded ${rangeLabel(offboardFrom, offboardTo)}`}
          onRemove={onOffboardClear}
        />
      )}
    </div>
  );
}
