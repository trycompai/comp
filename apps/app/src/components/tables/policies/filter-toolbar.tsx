'use client';

import { CreatePolicySheet } from '@/components/sheets/create-policy-sheet';
import { Button } from '@comp/ui/button';
import { cn } from '@comp/ui/cn';
import { Input } from '@comp/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@comp/ui/select';
import { Skeleton } from '@comp/ui/skeleton';
import { User } from 'better-auth';
import { Plus, Search, X } from 'lucide-react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useQueryState } from 'nuqs';
import { useCallback, useEffect, useState, useTransition } from 'react';

interface FilterToolbarProps {
  isEmpty?: boolean;
  users: User[];
}

export function FilterToolbar({ isEmpty = false, users }: FilterToolbarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [open, setOpen] = useQueryState('create-policy-sheet');
  const [isPending, startTransition] = useTransition();
  const [searchInput, setSearchInput] = useState<string>('');

  const [search, setSearch] = useQueryState('search', {
    shallow: false,
    history: 'push',
    parse: (value) => value || null,
  });

  const [status, setStatus] = useQueryState('status', {
    shallow: false,
    history: 'push',
    parse: (value) => value || null,
  });

  const [assigneeId, setAssigneeId] = useQueryState('assigneeId', {
    shallow: false,
    history: 'push',
    parse: (value) => value || null,
  });

  const [sort, setSort] = useQueryState('sort', {
    shallow: false,
    history: 'push',
    parse: (value) => value || null,
  });

  useEffect(() => {
    setSearchInput(search || '');
  }, [search]);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchInput !== (search || '')) {
        setSearch(searchInput || null);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchInput, search, setSearch]);

  const handleReset = useCallback(() => {
    startTransition(() => {
      setSearch(null);
      setStatus(null);
      setAssigneeId(null);
      setSort(null);
      setSearchInput('');
    });
  }, [setSearch, setStatus, setAssigneeId, setSort]);

  const hasFilters = search || status || assigneeId || sort;

  const handleStatusChange = (value: string) => {
    setStatus(value === 'all' ? null : value);
  };

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
            placeholder={'Search policies...'}
            className="pl-8"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
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
        <Select value={status || 'all'} onValueChange={handleStatusChange}>
          <SelectTrigger className="w-auto min-w-[100px]">
            <SelectValue placeholder={'Filter by status'} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{'All statuses'}</SelectItem>
            <SelectItem value="draft">{'Draft'}</SelectItem>
            <SelectItem value="published">{'Published'}</SelectItem>
            <SelectItem value="needs_review">{'Needs Review'}</SelectItem>
            <SelectItem value="archived">{'Archived'}</SelectItem>
          </SelectContent>
        </Select>

        <Select value={assigneeId || ''} onValueChange={(value) => setAssigneeId(value || null)}>
          <SelectTrigger className="w-[200px] min-w-[200px]">
            <SelectValue placeholder={'Assignee'} />
          </SelectTrigger>
          <SelectContent>
            {users.map((user) => (
              <SelectItem key={user.id} value={user?.id || ''}>
                {user.name}
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

        <Button variant="default" onClick={() => setOpen('true')}>
          <Plus className="h-4 w-4" />
          {'Create New Policy'}
        </Button>
      </div>

      <CreatePolicySheet />
    </div>
  );
}
