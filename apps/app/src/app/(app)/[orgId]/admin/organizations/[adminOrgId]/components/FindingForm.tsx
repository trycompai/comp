'use client';

import { api } from '@/lib/api-client';
import {
  Button,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  Stack,
  Text,
} from '@trycompai/design-system';
import { Label } from '@trycompai/ui/label';
import { Textarea } from '@trycompai/ui/textarea';
import { useEffect, useState } from 'react';

interface FindingFormProps {
  orgId: string;
  onCreated: () => void;
}

interface TaskOption {
  id: string;
  title: string;
  status: string;
}

type TargetType = 'task' | 'evidenceFormType';

const EVIDENCE_FORM_TYPES = [
  { value: 'board-meeting', label: 'Board Meeting' },
  { value: 'it-leadership-meeting', label: 'IT Leadership Meeting' },
  { value: 'risk-committee-meeting', label: 'Risk Committee Meeting' },
  { value: 'meeting', label: 'Meeting' },
  { value: 'access-request', label: 'Access Request' },
  { value: 'whistleblower-report', label: 'Whistleblower Report' },
  { value: 'penetration-test', label: 'Penetration Test' },
  { value: 'rbac-matrix', label: 'RBAC Matrix' },
  { value: 'infrastructure-inventory', label: 'Infrastructure Inventory' },
  { value: 'employee-performance-evaluation', label: 'Employee Performance Evaluation' },
  { value: 'network-diagram', label: 'Network Diagram' },
  { value: 'tabletop-exercise', label: 'Tabletop Exercise' },
];

export function FindingForm({ orgId, onCreated }: FindingFormProps) {
  const [content, setContent] = useState('');
  const [targetType, setTargetType] = useState<TargetType>('task');
  const [selectedTaskId, setSelectedTaskId] = useState('');
  const [selectedFormType, setSelectedFormType] = useState('');
  const [tasks, setTasks] = useState<TaskOption[]>([]);
  const [loadingTasks, setLoadingTasks] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTasks = async () => {
      setLoadingTasks(true);
      const res = await api.get<{ data: TaskOption[] }>(
        `/v1/admin/organizations/${orgId}/tasks`,
      );
      if (res.data) setTasks(res.data.data);
      setLoadingTasks(false);
    };
    void fetchTasks();
  }, [orgId]);

  const hasTarget =
    (targetType === 'task' && selectedTaskId) ||
    (targetType === 'evidenceFormType' && selectedFormType);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim() || !hasTarget) return;

    setSubmitting(true);
    setError(null);

    const body: Record<string, string> = { content };
    if (targetType === 'task') {
      body.taskId = selectedTaskId;
    } else {
      body.evidenceFormType = selectedFormType;
    }

    const res = await api.post(
      `/v1/admin/organizations/${orgId}/findings`,
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
          <Label htmlFor="finding-content">Finding Content</Label>
          <Textarea
            id="finding-content"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Describe the finding..."
            rows={4}
          />
        </div>

        <div>
          <Label>Target Type</Label>
          <Select
            value={targetType}
            onValueChange={(val) => {
              if (!val) return;
              setTargetType(val as TargetType);
              setSelectedTaskId('');
              setSelectedFormType('');
            }}
          >
            <SelectTrigger>
              <span className="text-sm">
                {targetType === 'task' ? 'Task' : 'Evidence Form'}
              </span>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="task">Task</SelectItem>
              <SelectItem value="evidenceFormType">Evidence Form</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {targetType === 'task' && (
          <div>
            <Label>Task</Label>
            {loadingTasks ? (
              <Text size="sm" variant="muted">Loading tasks...</Text>
            ) : (
              <Select
                value={selectedTaskId}
                onValueChange={(val) => { if (val) setSelectedTaskId(val); }}
              >
                <SelectTrigger>
                  <span className="text-sm">
                    {tasks.find((t) => t.id === selectedTaskId)?.title ?? 'Select a task...'}
                  </span>
                </SelectTrigger>
                <SelectContent>
                  {tasks.map((task) => (
                    <SelectItem key={task.id} value={task.id}>
                      {task.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        )}

        {targetType === 'evidenceFormType' && (
          <div>
            <Label>Evidence Form</Label>
            <Select
              value={selectedFormType}
              onValueChange={(val) => { if (val) setSelectedFormType(val); }}
            >
              <SelectTrigger>
                <span className="text-sm">
                  {EVIDENCE_FORM_TYPES.find((ft) => ft.value === selectedFormType)?.label ?? 'Select a form type...'}
                </span>
              </SelectTrigger>
              <SelectContent>
                {EVIDENCE_FORM_TYPES.map((ft) => (
                  <SelectItem key={ft.value} value={ft.value}>
                    {ft.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {error && (
          <Text size="sm" variant="destructive">
            {error}
          </Text>
        )}

        <Button
          type="submit"
          loading={submitting}
          disabled={!content.trim() || !hasTarget}
        >
          Create Finding
        </Button>
      </Stack>
    </form>
  );
}
