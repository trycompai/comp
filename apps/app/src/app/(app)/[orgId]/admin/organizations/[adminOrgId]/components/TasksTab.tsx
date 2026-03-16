'use client';

import { api } from '@/lib/api-client';
import {
  Badge,
  Button,
  Section,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  Sheet,
  SheetBody,
  SheetContent,
  SheetHeader,
  SheetTitle,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Text,
} from '@trycompai/design-system';
import { Add, View } from '@trycompai/design-system/icons';
import { useCallback, useEffect, useState } from 'react';
import { TaskDetailSheet } from './TaskDetailSheet';
import { TaskForm } from './TaskForm';

interface Task {
  id: string;
  title: string;
  status: string;
  department: string | null;
  assigneeId: string | null;
  frequency: string | null;
  createdAt: string;
  updatedAt: string;
}

interface TasksResponse {
  data: Task[];
  count: number;
}

const STATUS_OPTIONS = ['todo', 'in_progress', 'done', 'not_applicable'];
const DEPARTMENT_OPTIONS = ['none', 'admin', 'gov', 'hr', 'it', 'itsm', 'qms'];
const FREQUENCY_OPTIONS = [
  'daily',
  'weekly',
  'monthly',
  'quarterly',
  'yearly',
];

const STATUS_VARIANT: Record<
  string,
  'default' | 'secondary' | 'destructive' | 'outline'
> = {
  todo: 'outline',
  in_progress: 'secondary',
  done: 'default',
  not_applicable: 'destructive',
};

const DEPARTMENT_LABELS: Record<string, string> = {
  none: 'None',
  admin: 'Admin',
  gov: 'Gov',
  hr: 'HR',
  it: 'IT',
  itsm: 'ITSM',
  qms: 'QMS',
};

function formatLabel(value: string) {
  return value
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export function TasksTab({ orgId }: { orgId: string }) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [viewingTaskId, setViewingTaskId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  const fetchTasks = useCallback(async () => {
    setLoading(true);
    const res = await api.get<TasksResponse>(
      `/v1/admin/organizations/${orgId}/tasks`,
    );
    if (res.data) setTasks(res.data.data);
    setLoading(false);
  }, [orgId]);

  useEffect(() => {
    void fetchTasks();
  }, [fetchTasks]);

  const handleFieldChange = async (
    taskId: string,
    field: string,
    value: string | null,
  ) => {
    setUpdatingId(taskId);
    const res = await api.patch(
      `/v1/admin/organizations/${orgId}/tasks/${taskId}`,
      { [field]: value },
    );
    if (!res.error) {
      setTasks((prev) =>
        prev.map((t) => (t.id === taskId ? { ...t, [field]: value } : t)),
      );
    }
    setUpdatingId(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12 text-muted-foreground">
        Loading tasks...
      </div>
    );
  }

  const handleCreated = () => {
    setShowForm(false);
    void fetchTasks();
  };

  return (
    <>
    <Section
      title={`Tasks (${tasks.length})`}
      actions={
        <Button
          size="sm"
          iconLeft={<Add size={16} />}
          onClick={() => setShowForm(true)}
        >
          Create Task
        </Button>
      }
    >
      {tasks.length === 0 ? (
        <div className="rounded-lg border border-dashed py-8 text-center text-sm text-muted-foreground">
          No tasks for this organization.
        </div>
      ) : (
        <Table variant="bordered">
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead>Department</TableHead>
              <TableHead>Frequency</TableHead>
              <TableHead>Status</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {[...tasks].sort((a, b) => a.title.localeCompare(b.title)).map((task) => {
              const isUpdating = updatingId === task.id;
              return (
                <TableRow key={task.id}>
                  <TableCell>
                    <div className="max-w-[400px] truncate">
                      <Text size="sm" weight="medium">
                        {task.title}
                      </Text>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Select
                      value={task.department ?? 'none'}
                      onValueChange={(val) => {
                        if (val)
                          void handleFieldChange(task.id, 'department', val);
                      }}
                      disabled={isUpdating}
                    >
                      <SelectTrigger size="sm">
                        <span className="text-sm">
                          {DEPARTMENT_LABELS[task.department ?? 'none'] ?? formatLabel(task.department ?? 'none')}
                        </span>
                      </SelectTrigger>
                      <SelectContent alignItemWithTrigger={false}>
                        {DEPARTMENT_OPTIONS.map((d) => (
                          <SelectItem key={d} value={d}>
                            {DEPARTMENT_LABELS[d] ?? d}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    <Select
                      value={task.frequency ?? 'none'}
                      onValueChange={(val) => {
                        if (val)
                          void handleFieldChange(
                            task.id,
                            'frequency',
                            val === 'none' ? null : val,
                          );
                      }}
                      disabled={isUpdating}
                    >
                      <SelectTrigger size="sm">
                        <span className="text-sm">
                          {task.frequency
                            ? formatLabel(task.frequency)
                            : '--'}
                        </span>
                      </SelectTrigger>
                      <SelectContent alignItemWithTrigger={false}>
                        <SelectItem value="none">--</SelectItem>
                        {FREQUENCY_OPTIONS.map((f) => (
                          <SelectItem key={f} value={f}>
                            {formatLabel(f)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    <Select
                      value={task.status}
                      onValueChange={(val) => {
                        if (val)
                          void handleFieldChange(task.id, 'status', val);
                      }}
                      disabled={isUpdating}
                    >
                      <SelectTrigger size="sm">
                        <Badge
                          variant={STATUS_VARIANT[task.status] ?? 'default'}
                        >
                          {formatLabel(task.status)}
                        </Badge>
                      </SelectTrigger>
                      <SelectContent alignItemWithTrigger={false}>
                        {STATUS_OPTIONS.map((s) => (
                          <SelectItem key={s} value={s}>
                            {formatLabel(s)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    <Button
                      size="sm"
                      variant="ghost"
                      iconLeft={<View size={16} />}
                      onClick={() => setViewingTaskId(task.id)}
                    >
                      View
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}
      <TaskDetailSheet
        taskId={viewingTaskId}
        orgId={orgId}
        onClose={() => setViewingTaskId(null)}
      />
    </Section>

    <Sheet open={showForm} onOpenChange={setShowForm}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Create Task</SheetTitle>
        </SheetHeader>
        <SheetBody>
          <TaskForm orgId={orgId} onCreated={handleCreated} />
        </SheetBody>
      </SheetContent>
    </Sheet>
    </>
  );
}
