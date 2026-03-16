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
import { useState } from 'react';

interface PolicyFormProps {
  orgId: string;
  onCreated: () => void;
}

const STATUS_OPTIONS = [
  { value: 'draft', label: 'Draft' },
  { value: 'published', label: 'Published' },
  { value: 'needs_review', label: 'Needs Review' },
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
  { value: 'monthly', label: 'Monthly' },
  { value: 'quarterly', label: 'Quarterly' },
  { value: 'yearly', label: 'Yearly' },
];

export function PolicyForm({ orgId, onCreated }: PolicyFormProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState('');
  const [department, setDepartment] = useState('');
  const [frequency, setFrequency] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setSubmitting(true);
    setError(null);

    const body: Record<string, string> = { name: name.trim() };
    if (description.trim()) body.description = description.trim();
    if (status) body.status = status;
    if (department && department !== 'none') body.department = department;
    if (frequency) body.frequency = frequency;

    const res = await api.post(
      `/v1/admin/organizations/${orgId}/policies`,
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
          <Label htmlFor="policy-name">Name</Label>
          <Input
            id="policy-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Policy name..."
          />
        </div>

        <div>
          <Label htmlFor="policy-description">Description (optional)</Label>
          <Input
            id="policy-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Brief description..."
          />
        </div>

        <div>
          <Label>Status</Label>
          <Select value={status} onValueChange={(val) => { if (val) setStatus(val); }}>
            <SelectTrigger>
              <span className="text-sm">
                {STATUS_OPTIONS.find((o) => o.value === status)?.label ?? 'Draft (default)'}
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

        <Button type="submit" loading={submitting} disabled={!name.trim()}>
          Create Policy
        </Button>
      </Stack>
    </form>
  );
}
