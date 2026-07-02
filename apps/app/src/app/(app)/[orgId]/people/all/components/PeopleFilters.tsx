'use client';

import {
  Badge,
  Button,
  Popover,
  PopoverContent,
  PopoverTrigger,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@trycompai/design-system';
import { Filter } from '@trycompai/design-system/icons';

import { DateRangeFilter } from './DateRangeFilter';

interface PeopleFiltersProps {
  statusFilter: string;
  hasOffboardFilter: boolean;
  onStatusChange: (value: string | undefined) => void;
  roleFilter: string;
  onRoleChange: (value: string | undefined) => void;
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
    <Popover>
      <PopoverTrigger>
        <Button variant="outline" iconLeft={<Filter size={16} />}>
          Filters
          {activeCount > 0 && <Badge variant="accent">{activeCount}</Badge>}
        </Button>
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
  );
}
