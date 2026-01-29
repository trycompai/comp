import type { AssigneeOption } from '@/components/SelectAssignee';
import { VendorStatus } from '@/components/vendor-status';
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  HStack,
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@trycompai/design-system';
import { Search } from '@trycompai/design-system/icons';
import type { VendorCategory, VendorStatus as VendorStatusEnum } from '@db';
import { CATEGORY_MAP, VENDOR_STATUS_LABELS } from './vendors-table-constants';
import { UserIcon } from 'lucide-react';
import { useDebouncedCallback } from 'use-debounce';
import { useEffect, useRef, useState } from 'react';

interface VendorsFiltersProps {
  searchQuery: string;
  statusFilter: VendorStatusEnum | 'all';
  categoryFilter: VendorCategory | 'all';
  assigneeFilter: string;
  assignees: AssigneeOption[];
  onSearchChange: (value: string) => void;
  onStatusChange: (value: string | null) => void;
  onCategoryChange: (value: string | null) => void;
  onAssigneeChange: (value: string | null) => void;
}

export function VendorsFilters({
  searchQuery,
  statusFilter,
  categoryFilter,
  assigneeFilter,
  assignees,
  onSearchChange,
  onStatusChange,
  onCategoryChange,
  onAssigneeChange,
}: VendorsFiltersProps) {
  const [localSearch, setLocalSearch] = useState(searchQuery);
  const isUserTypingRef = useRef(false);
  const debouncedSearchChange = useDebouncedCallback((value: string) => {
    isUserTypingRef.current = false;
    onSearchChange(value);
  }, 300);

  useEffect(() => {
    if (!isUserTypingRef.current && searchQuery !== localSearch) {
      setLocalSearch(searchQuery);
    }
  }, [searchQuery]);

  return (
    <div className="flex flex-col gap-3 md:flex-row md:items-end">
      <div className="w-full md:max-w-[300px]">
        <InputGroup>
          <InputGroupAddon>
            <Search size={16} />
          </InputGroupAddon>
          <InputGroupInput
            placeholder="Search vendors..."
            value={localSearch}
            onChange={(e) => {
              const nextValue = e.target.value;
              setLocalSearch(nextValue);
                isUserTypingRef.current = true;
              debouncedSearchChange(nextValue);
            }}
          />
        </InputGroup>
      </div>
      <div className="flex flex-1 flex-wrap gap-2">
        <div className="min-w-[160px] flex-1 md:flex-none">
          <Select value={statusFilter} onValueChange={onStatusChange}>
            <SelectTrigger>
              <SelectValue placeholder="Status">
                {statusFilter === 'all' ? 'All Statuses' : <VendorStatus status={statusFilter} />}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              {(Object.keys(VENDOR_STATUS_LABELS) as VendorStatusEnum[]).map((status) => (
                <SelectItem key={status} value={status}>
                  <VendorStatus status={status} />
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="min-w-[160px] flex-1 md:flex-none">
          <Select value={categoryFilter} onValueChange={onCategoryChange}>
            <SelectTrigger>
              <SelectValue placeholder="Category">
                {categoryFilter === 'all' ? 'All Categories' : CATEGORY_MAP[categoryFilter]}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {(Object.keys(CATEGORY_MAP) as VendorCategory[]).map((category) => (
                <SelectItem key={category} value={category}>
                  {CATEGORY_MAP[category]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="min-w-[180px] flex-1 md:flex-none">
          <Select value={assigneeFilter} onValueChange={onAssigneeChange}>
            <SelectTrigger>
              <SelectValue placeholder="Owner">
                {assigneeFilter === 'all' ? (
                  'All Owners'
                ) : assigneeFilter === 'unassigned' ? (
                  'Unassigned'
                ) : (
                  (() => {
                    const selected = assignees.find((assignee) => assignee.id === assigneeFilter);
                    if (!selected) return 'Owner';
                    return (
                      <HStack gap="2" align="center">
                        <Avatar size="xs">
                          <AvatarImage
                            src={selected.user.image || undefined}
                            alt={selected.user.name || selected.user.email}
                          />
                          <AvatarFallback>
                            {selected.user.name?.charAt(0) ||
                              selected.user.email?.charAt(0).toUpperCase() ||
                              '?'}
                          </AvatarFallback>
                        </Avatar>
                        {selected.user.name || selected.user.email}
                      </HStack>
                    );
                  })()
                )}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Owners</SelectItem>
              <SelectItem value="unassigned">
                <HStack gap="2" align="center">
                  <div className="bg-muted flex h-5 w-5 items-center justify-center rounded-full">
                    <UserIcon className="h-3 w-3 text-muted-foreground" />
                  </div>
                  Unassigned
                </HStack>
              </SelectItem>
              {assignees.map((assignee) => (
                <SelectItem key={assignee.id} value={assignee.id}>
                  <HStack gap="2" align="center">
                    <Avatar size="xs">
                      <AvatarImage
                        src={assignee.user.image || undefined}
                        alt={assignee.user.name || assignee.user.email}
                      />
                      <AvatarFallback>
                        {assignee.user.name?.charAt(0) ||
                          assignee.user.email?.charAt(0).toUpperCase() ||
                          '?'}
                      </AvatarFallback>
                    </Avatar>
                    {assignee.user.name || assignee.user.email}
                  </HStack>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}
