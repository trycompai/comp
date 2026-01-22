'use client';

import { StatusIndicator } from '@/components/status-indicator';
import { Task } from '@db';
import { InputGroup, InputGroupAddon, InputGroupInput } from '@trycompai/design-system';
import { Search } from '@trycompai/design-system/icons';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Text,
} from '@trycompai/design-system';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';

interface TasksTableProps {
  tasks: Task[];
  orgId: string;
}

export function TasksTable({ tasks, orgId }: TasksTableProps) {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState('');

  // Filter tasks data based on search term
  const filteredTasks = useMemo(() => {
    if (!searchTerm.trim()) return tasks;

    const searchLower = searchTerm.toLowerCase();
    return tasks.filter(
      (task) =>
        task.id.toLowerCase().includes(searchLower) ||
        task.title.toLowerCase().includes(searchLower) ||
        task.description.toLowerCase().includes(searchLower),
    );
  }, [tasks, searchTerm]);

  const handleRowClick = (taskId: string) => {
    router.push(`/${orgId}/tasks/${taskId}`);
  };

  return (
    <div className="space-y-4">
      <div className="w-full max-w-sm">
        <InputGroup>
          <InputGroupAddon>
            <Search size={16} />
          </InputGroupAddon>
          <InputGroupInput
            placeholder="Search tasks..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </InputGroup>
      </div>

      <Table variant="bordered">
        <TableHeader>
          <TableRow>
            <TableHead>Title</TableHead>
            <TableHead>Description</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filteredTasks.length === 0 ? (
            <TableRow>
              <TableCell colSpan={3}>
                <Text size="sm" variant="muted">
                  No tasks found.
                </Text>
              </TableCell>
            </TableRow>
          ) : (
            filteredTasks.map((task) => (
              <TableRow
                key={task.id}
                role="button"
                tabIndex={0}
                onClick={() => handleRowClick(task.id)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    handleRowClick(task.id);
                  }
                }}
              >
                <TableCell>{task.title}</TableCell>
                <TableCell>
                  <span className="line-clamp-1 capitalize">{task.description}</span>
                </TableCell>
                <TableCell>
                  <StatusIndicator status={task.status} />
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
