'use client';

import { CreateRiskSheet } from '@/components/sheets/create-risk-sheet';
import { Button } from '@comp/ui/button';
import { cn } from '@comp/ui/cn';
import { Input } from '@comp/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@comp/ui/select';
import { Skeleton } from '@comp/ui/skeleton';
import { Departments, Member, RiskStatus, User } from '@db';
import { Plus, Search, X } from 'lucide-react';
import { useQueryState } from 'nuqs';
import { useCallback, useTransition } from 'react';

const riskStatuses = Object.values(RiskStatus);
const departments = Object.values(Departments).filter((d) => d !== 'none');

type Props = {
  isEmpty?: boolean;
  users: (Member & { user: User })[];
};

const statusTranslationKeys = {
  open: 'common.status.open',
  pending: 'common.status.pending',
  closed: 'common.status.closed',
  archived: 'common.status.archived',
} as const;

export function FilterToolbar({ isEmpty, users }: Props) {
  const [isPending, startTransition] = useTransition();
  const [open, setOpen] = useQueryState('create-risk-sheet');

  const [search, setSearch] = useQueryState('search', {
    shallow: false,
    history: 'push',
    parse: (value) => value || null,
  });

  const [category, setCategory] = useQueryState('category', {
    shallow: false,
    history: 'push',
    parse: (value) => value || null,
  });

  const [status, setStatus] = useQueryState('status', {
    shallow: false,
    history: 'push',
    parse: (value) => value || null,
  });

  const [department, setDepartment] = useQueryState('department', {
    shallow: false,
    history: 'push',
    parse: (value) => value || null,
  });

  const [assigneeId, setAssigneeId] = useQueryState('assigneeId', {
    shallow: false,
    history: 'push',
    parse: (value) => value || null,
  });

  const handleReset = useCallback(() => {
    startTransition(() => {
      Promise.all([
        setSearch(null),
        setCategory(null),
        setStatus(null),
        setDepartment(null),
        setAssigneeId(null),
      ]);
    });
  }, [setSearch, setCategory, setStatus, setDepartment, setAssigneeId]);

  const hasFilters = search || category || status || department || assigneeId;

  if (isEmpty) {
    return (
      <div className="pointer-events-none mb-4 flex flex-col gap-4 opacity-20 blur-[7px] md:flex-row md:items-center md:justify-between">
        <div className="relative flex-1 md:max-w-sm">
          <Skeleton className={cn('h-10', isEmpty && 'animate-none')} />
        </div>

        <div className="hidden gap-2 md:flex md:flex-row md:items-center">
          <Skeleton className={cn('h-10 w-[200px]', isEmpty && 'animate-none')} />
          <Skeleton className={cn('h-10 w-[200px]', isEmpty && 'animate-none')} />
          <Skeleton className={cn('h-9 w-[120px]', isEmpty && 'animate-none')} />
        </div>
      </div>
    );
  }

  return (
    <div className="mb-4 flex flex-row items-center justify-between gap-2">
      <div className="flex min-w-0 flex-1 items-center gap-2">
        <div className="relative flex-1 md:max-w-sm">
          <Search className="text-muted-foreground absolute top-2.5 left-2 h-4 w-4" />
          <Input
            placeholder={'Search...'}
            className="pl-8"
            value={search || ''}
            onChange={(e) => setSearch(e.target.value || null)}
          />
        </div>

        <div className="md:hidden">
          <Button onClick={() => setOpen('true')} variant="default">
            <Plus className="h-4 w-4" />
            {'Add New'}
          </Button>
        </div>
      </div>

      <div className="hidden items-center gap-2 md:flex">
        <Select value={status || ''} onValueChange={(value) => setStatus(value || null)}>
          <SelectTrigger className="w-auto min-w-[100px]">
            <SelectValue placeholder={'Status'} />
          </SelectTrigger>
          <SelectContent>
            {riskStatuses.map((stat) => (
              <SelectItem key={stat} value={stat}>
                {stat.charAt(0).toUpperCase() + stat.slice(1).replace(/_/g, ' ')}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={department || ''} onValueChange={(value) => setDepartment(value || null)}>
          <SelectTrigger className="w-[150px] min-w-[150px]">
            <SelectValue placeholder={'Department'} />
          </SelectTrigger>
          <SelectContent>
            {departments.map((dept) => (
              <SelectItem key={dept} value={dept}>
                {dept.replace(/_/g, ' ').toUpperCase()}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={assigneeId || ''} onValueChange={(value) => setAssigneeId(value || null)}>
          <SelectTrigger className="w-[200px] min-w-[200px]">
            <SelectValue placeholder={'Filter by assignee'} />
          </SelectTrigger>
          <SelectContent>
            {users.map((user) => (
              <SelectItem key={user.id} value={user.id}>
                {user.user.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {hasFilters && (
          <Button variant="ghost" size="sm" onClick={handleReset} disabled={isPending}>
            <X className="mr-2 h-4 w-4" />
            {'Clear'}
          </Button>
        )}

        <Button onClick={() => setOpen('true')} variant="default">
          <Plus className="h-4 w-4" />
          {'Add New'}
        </Button>
      </div>

      <CreateRiskSheet assignees={users} />
    </div>
  );
}
