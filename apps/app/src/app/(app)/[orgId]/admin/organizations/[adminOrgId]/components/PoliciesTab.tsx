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
import { PolicyContentSheet } from './PolicyContentSheet';
import { PolicyForm } from './PolicyForm';

interface Policy {
  id: string;
  name: string;
  description: string | null;
  status: string;
  department: string | null;
  frequency: string | null;
  lastPublishedAt: string | null;
  content: unknown[];
  draftContent?: unknown[];
  assignee: { id: string; user: { name: string } } | null;
}

const STATUS_OPTIONS = ['draft', 'published', 'needs_review'];
const DEPARTMENT_OPTIONS = ['none', 'admin', 'gov', 'hr', 'it', 'itsm', 'qms'];
const FREQUENCY_OPTIONS = ['monthly', 'quarterly', 'yearly'];

const STATUS_VARIANT: Record<string, 'default' | 'secondary' | 'outline'> = {
  draft: 'outline', published: 'default', needs_review: 'secondary',
};

const DEPARTMENT_LABELS: Record<string, string> = {
  none: 'None', admin: 'Admin', gov: 'Gov', hr: 'HR',
  it: 'IT', itsm: 'ITSM', qms: 'QMS',
};

function formatLabel(value: string) {
  return value.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

export function PoliciesTab({ orgId }: { orgId: string }) {
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [viewingPolicy, setViewingPolicy] = useState<Policy | null>(null);
  const [showForm, setShowForm] = useState(false);

  const fetchPolicies = useCallback(async () => {
    setLoading(true);
    const res = await api.get<Policy[]>(`/v1/admin/organizations/${orgId}/policies`);
    if (res.data) setPolicies(res.data);
    setLoading(false);
  }, [orgId]);

  useEffect(() => { void fetchPolicies(); }, [fetchPolicies]);

  const handleFieldChange = async (policyId: string, field: string, value: string | null) => {
    setUpdatingId(policyId);
    const res = await api.patch(`/v1/admin/organizations/${orgId}/policies/${policyId}`, { [field]: value });
    if (!res.error) {
      setPolicies((prev) => prev.map((p) => (p.id === policyId ? { ...p, [field]: value } : p)));
    }
    setUpdatingId(null);
  };

  const handleCreated = () => {
    setShowForm(false);
    void fetchPolicies();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12 text-muted-foreground">
        Loading policies...
      </div>
    );
  }

  return (
    <>
      <Section
        title={`Policies (${policies.length})`}
        actions={
          <Button size="sm" iconLeft={<Add size={16} />} onClick={() => setShowForm(true)}>
            Create Policy
          </Button>
        }
      >
        {policies.length === 0 ? (
          <div className="rounded-lg border border-dashed py-8 text-center text-sm text-muted-foreground">
            No policies for this organization.
          </div>
        ) : (
          <Table variant="bordered">
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Department</TableHead>
                <TableHead>Frequency</TableHead>
                <TableHead>Assignee</TableHead>
                <TableHead>Last Published</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {[...policies].sort((a, b) => a.name.localeCompare(b.name)).map((policy) => (
                <PolicyRow
                  key={policy.id}
                  policy={policy}
                  isUpdating={updatingId === policy.id}
                  onFieldChange={handleFieldChange}
                  onView={setViewingPolicy}
                />
              ))}
            </TableBody>
          </Table>
        )}
      </Section>

      <PolicyContentSheet
        policy={viewingPolicy}
        orgId={orgId}
        onClose={() => setViewingPolicy(null)}
        onRegenerated={() => { setViewingPolicy(null); void fetchPolicies(); }}
      />

      <Sheet open={showForm} onOpenChange={setShowForm}>
        <SheetContent>
          <SheetHeader><SheetTitle>Create Policy</SheetTitle></SheetHeader>
          <SheetBody>
            <PolicyForm orgId={orgId} onCreated={handleCreated} />
          </SheetBody>
        </SheetContent>
      </Sheet>
    </>
  );
}

function PolicyRow({
  policy, isUpdating, onFieldChange, onView,
}: {
  policy: Policy;
  isUpdating: boolean;
  onFieldChange: (id: string, field: string, value: string | null) => void;
  onView: (policy: Policy) => void;
}) {
  return (
    <TableRow>
      <TableCell>
        <div className="max-w-[400px]">
          <div className="truncate">
            <Text size="sm" weight="medium">{policy.name}</Text>
          </div>
          {policy.description && (
            <div className="truncate">
              <Text size="xs" variant="muted">{policy.description}</Text>
            </div>
          )}
        </div>
      </TableCell>
      <TableCell>
        <Select
          value={policy.status}
          onValueChange={(val) => { if (val) void onFieldChange(policy.id, 'status', val); }}
          disabled={isUpdating}
        >
          <SelectTrigger size="sm">
            <Badge variant={STATUS_VARIANT[policy.status] ?? 'default'}>{formatLabel(policy.status)}</Badge>
          </SelectTrigger>
          <SelectContent alignItemWithTrigger={false}>
            {STATUS_OPTIONS.map((s) => (<SelectItem key={s} value={s}>{formatLabel(s)}</SelectItem>))}
          </SelectContent>
        </Select>
      </TableCell>
      <TableCell>
        <Select
          value={policy.department ?? 'none'}
          onValueChange={(val) => { if (val) void onFieldChange(policy.id, 'department', val); }}
          disabled={isUpdating}
        >
          <SelectTrigger size="sm">
            <span className="text-sm">
              {DEPARTMENT_LABELS[policy.department ?? 'none'] ?? formatLabel(policy.department ?? 'none')}
            </span>
          </SelectTrigger>
          <SelectContent alignItemWithTrigger={false}>
            {DEPARTMENT_OPTIONS.map((d) => (<SelectItem key={d} value={d}>{DEPARTMENT_LABELS[d] ?? d}</SelectItem>))}
          </SelectContent>
        </Select>
      </TableCell>
      <TableCell>
        <Select
          value={policy.frequency ?? 'none'}
          onValueChange={(val) => {
            if (val) void onFieldChange(policy.id, 'frequency', val === 'none' ? null : val);
          }}
          disabled={isUpdating}
        >
          <SelectTrigger size="sm">
            <span className="text-sm">{policy.frequency ? formatLabel(policy.frequency) : '--'}</span>
          </SelectTrigger>
          <SelectContent alignItemWithTrigger={false}>
            <SelectItem value="none">--</SelectItem>
            {FREQUENCY_OPTIONS.map((f) => (<SelectItem key={f} value={f}>{formatLabel(f)}</SelectItem>))}
          </SelectContent>
        </Select>
      </TableCell>
      <TableCell>
        <Text size="sm" variant="muted">{policy.assignee?.user.name ?? '--'}</Text>
      </TableCell>
      <TableCell>
        <Text size="sm" variant="muted">
          {policy.lastPublishedAt ? new Date(policy.lastPublishedAt).toLocaleDateString() : '--'}
        </Text>
      </TableCell>
      <TableCell>
        <Button size="sm" variant="outline" iconLeft={<View size={16} />} onClick={() => onView(policy)}>
          View
        </Button>
      </TableCell>
    </TableRow>
  );
}
