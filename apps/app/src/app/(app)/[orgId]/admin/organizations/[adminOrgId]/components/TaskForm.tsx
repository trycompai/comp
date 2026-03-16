'use client';

import { api } from '@/lib/api-client';
import {
  Button,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  Stack,
  Text,
} from '@trycompai/design-system';
import { Label } from '@trycompai/ui/label';
import { Textarea } from '@trycompai/ui/textarea';
import { useState } from 'react';

interface TaskFormProps {
  orgId: string;
  onCreated: () => void;
}

const STATUS_OPTIONS = [
  { value: 'todo', label: 'To Do' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'in_review', label: 'In Review' },
  { value: 'done', label: 'Done' },
];

const DEPARTMENT_OPTIONS = [
  { value: 'none', label: 'None' },
  { value: 'admin', label: 'Admin' },
  { value: 'gov', label: 'Gov' },
  { value: 'hr', label: 'HR' },
  { value: 'it', label: 'IT' },
  { value: 'itsm', label: 'ITSM' },
  { value: 'qms', label: 'QMS' },
];

const FREQUENCY_OPTIONS = [
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'quarterly', label: 'Quarterly' },
  { value: 'yearly', label: 'Yearly' },
];

export function TaskForm({ orgId, onCreated }: TaskFormProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState('');
  const [department, setDepartment] = useState('');
  const [frequency, setFrequency] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isValid = title.trim() && description.trim();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid) return;

    setSubmitting(true);
    setError(null);

    const body: Record<string, string> = {
      title: title.trim(),
      description: description.trim(),
    };
    if (status) body.status = status;
    if (department && department !== 'none') body.department = department;
    if (frequency) body.frequency = frequency;

    const res = await api.post(
      `/v1/admin/organizations/${orgId}/tasks`,
      body,
    );

    if (res.error) {
      setError(res.error);
    } else {
      onCreated();
    }
    setSubmitting(false);
  };

  return (
    <form onSubmit={handleSubmit}>
      <Stack gap="md">
        <div>
          <Label htmlFor="task-title">Title</Label>
          <Input
            id="task-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Task title..."
          />
        </div>

        <div>
          <Label htmlFor="task-description">Description</Label>
          <Textarea
            id="task-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe the task..."
            rows={3}
          />
        </div>

        <div>
          <Label>Status</Label>
          <Select value={status} onValueChange={(val) => { if (val) setStatus(val); }}>
            <SelectTrigger>
              <span className="text-sm">
                {STATUS_OPTIONS.find((o) => o.value === status)?.label ?? 'To Do (default)'}
              </span>
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

        <div>
          <Label>Department</Label>
          <Select value={department} onValueChange={(val) => { if (val) setDepartment(val); }}>
            <SelectTrigger>
              <span className="text-sm">
                {DEPARTMENT_OPTIONS.find((o) => o.value === department)?.label ?? 'None (default)'}
              </span>
            </SelectTrigger>
            <SelectContent>
              {DEPARTMENT_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label>Frequency</Label>
          <Select value={frequency} onValueChange={(val) => { if (val) setFrequency(val); }}>
            <SelectTrigger>
              <span className="text-sm">
                {FREQUENCY_OPTIONS.find((o) => o.value === frequency)?.label ?? 'No frequency'}
              </span>
            </SelectTrigger>
            <SelectContent>
              {FREQUENCY_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {error && (
          <Text size="sm" variant="destructive">
            {error}
          </Text>
        )}

        <Button type="submit" loading={submitting} disabled={!isValid}>
          Create Task
        </Button>
      </Stack>
    </form>
  );
}
