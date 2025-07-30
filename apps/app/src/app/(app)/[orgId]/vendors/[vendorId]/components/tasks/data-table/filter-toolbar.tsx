'use client';

import { Button } from '@comp/ui/button';
import { Input } from '@comp/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@comp/ui/select';
import type { TaskStatus, User } from '@db';
import { XIcon } from 'lucide-react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

interface FilterToolbarProps {
  isEmpty: boolean;
  users: User[];
}

export function FilterToolbar({ isEmpty, users }: FilterToolbarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const search = searchParams.get('search') ?? '';
  const status = searchParams.get('status') as TaskStatus | null;
  const assigneeId = searchParams.get('assigneeId');

  const hasFilters = !!(search || status || assigneeId);

  function handleSearch(value: string) {
    const params = new URLSearchParams(searchParams);
    if (value) {
      params.set('search', value);
    } else {
      params.delete('search');
    }
    params.set('page', '1');
    router.push(`${pathname}?${params.toString()}`);
  }

  function handleStatusChange(value: string) {
    const params = new URLSearchParams(searchParams);
    if (value === 'all') {
      params.delete('status');
    } else {
      params.set('status', value);
    }
    params.set('page', '1');
    router.push(`${pathname}?${params.toString()}`);
  }

  function handleAssigneeChange(value: string) {
    const params = new URLSearchParams(searchParams);
    if (value === 'all') {
      params.delete('assigneeId');
    } else {
      params.set('assigneeId', value);
    }
    params.set('page', '1');
    router.push(`${pathname}?${params.toString()}`);
  }

  function handleClearFilters() {
    router.push(pathname);
  }

  return (
    <div className="mb-4 flex flex-col gap-4">
      <div className="flex flex-col gap-4 sm:flex-row">
        <Input
          placeholder={'Search tasks...'}
          value={search}
          onChange={(e) => handleSearch(e.target.value)}
          className="max-w-sm"
        />
        <div className="flex gap-4">
          <Select value={status ?? 'all'} onValueChange={handleStatusChange}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder={'Filter by status'} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{'All Statuses'}</SelectItem>
              <SelectItem value="not_started">{'Not Started'}</SelectItem>
              <SelectItem value="in_progress">{'In Progress'}</SelectItem>
              <SelectItem value="completed">{'Completed'}</SelectItem>
            </SelectContent>
          </Select>
          <Select value={assigneeId ?? 'all'} onValueChange={handleAssigneeChange}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder={'Filter by assignee'} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{'All Assignees'}</SelectItem>
              {users.map((user) => (
                <SelectItem key={user.id} value={user.id}>
                  {user.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      {hasFilters && !isEmpty && (
        <div className="flex justify-end">
          <Button variant="outline" onClick={handleClearFilters} className="gap-2">
            <XIcon className="h-4 w-4" />
            {'Clear filters'}
          </Button>
        </div>
      )}
    </div>
  );
}
