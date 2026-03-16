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

interface VendorFormProps {
  orgId: string;
  onCreated: () => void;
}

const CATEGORY_OPTIONS = [
  { value: 'cloud', label: 'Cloud' },
  { value: 'infrastructure', label: 'Infrastructure' },
  { value: 'software_as_a_service', label: 'SaaS' },
  { value: 'finance', label: 'Finance' },
  { value: 'marketing', label: 'Marketing' },
  { value: 'sales', label: 'Sales' },
  { value: 'hr', label: 'HR' },
  { value: 'other', label: 'Other' },
];

const STATUS_OPTIONS = [
  { value: 'not_assessed', label: 'Not Assessed' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'assessed', label: 'Assessed' },
];

export function VendorForm({ orgId, onCreated }: VendorFormProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [status, setStatus] = useState('');
  const [website, setWebsite] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isValid = name.trim() && description.trim();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid) return;

    setSubmitting(true);
    setError(null);

    const body: Record<string, string> = {
      name: name.trim(),
      description: description.trim(),
    };
    if (category) body.category = category;
    if (status) body.status = status;
    if (website.trim()) body.website = website.trim();

    const res = await api.post(
      `/v1/admin/organizations/${orgId}/vendors`,
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
          <Label htmlFor="vendor-name">Name</Label>
          <Input
            id="vendor-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Vendor name..."
          />
        </div>

        <div>
          <Label htmlFor="vendor-description">Description</Label>
          <Textarea
            id="vendor-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe the vendor and services..."
            rows={3}
          />
        </div>

        <div>
          <Label>Category</Label>
          <Select value={category} onValueChange={(val) => { if (val) setCategory(val); }}>
            <SelectTrigger>
              <span className="text-sm">
                {CATEGORY_OPTIONS.find((o) => o.value === category)?.label ?? 'Other (default)'}
              </span>
            </SelectTrigger>
            <SelectContent>
              {CATEGORY_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label>Status</Label>
          <Select value={status} onValueChange={(val) => { if (val) setStatus(val); }}>
            <SelectTrigger>
              <span className="text-sm">
                {STATUS_OPTIONS.find((o) => o.value === status)?.label ?? 'Not Assessed (default)'}
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
          <Label htmlFor="vendor-website">Website (optional)</Label>
          <Input
            id="vendor-website"
            value={website}
            onChange={(e) => setWebsite(e.target.value)}
            placeholder="https://example.com"
          />
        </div>

        {error && (
          <Text size="sm" variant="destructive">
            {error}
          </Text>
        )}

        <Button type="submit" loading={submitting} disabled={!isValid}>
          Create Vendor
        </Button>
      </Stack>
    </form>
  );
}
