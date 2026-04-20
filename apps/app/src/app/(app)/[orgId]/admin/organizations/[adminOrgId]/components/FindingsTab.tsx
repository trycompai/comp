'use client';

import { CreateFindingSheet } from '@/app/(app)/[orgId]/overview/components/CreateFindingSheet';
import { api } from '@/lib/api-client';
import type { CreateFindingData } from '@/hooks/use-findings-api';
import {
  Badge,
  Button,
  Section,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Text,
} from '@trycompai/design-system';
import { Add } from '@trycompai/design-system/icons';
import { useCallback, useEffect, useState } from 'react';

interface AdminFinding {
  id: string;
  type: string;
  status: string;
  severity: string;
  content: string;
  area: string | null;
  createdAt: string;
  createdBy?: { user?: { name: string; email: string } } | null;
  createdByAdmin?: { name: string; email: string } | null;
  task?: { id: string; title: string } | null;
  evidenceSubmission?: { id: string; formType: string } | null;
  evidenceFormType?: string | null;
  policy?: { id: string; name: string } | null;
  vendor?: { id: string; name: string } | null;
  risk?: { id: string; title: string } | null;
  member?: { id: string; user: { name: string; email: string } } | null;
  device?: { id: string; name: string; hostname: string } | null;
}

const STATUS_OPTIONS = ['open', 'ready_for_review', 'needs_revision', 'closed'];

const STATUS_VARIANT: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  open: 'destructive',
  ready_for_review: 'outline',
  needs_revision: 'secondary',
  closed: 'default',
};

const SEVERITY_VARIANT: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  low: 'outline',
  medium: 'secondary',
  high: 'secondary',
  critical: 'destructive',
};

function formatStatus(status: string) {
  return status.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function getCreatorName(finding: AdminFinding): string {
  return (
    finding.createdBy?.user?.name ||
    finding.createdBy?.user?.email ||
    finding.createdByAdmin?.name ||
    finding.createdByAdmin?.email ||
    'Unknown'
  );
}

function getTargetLabel(f: AdminFinding): string {
  if (f.task) return `Task: ${f.task.title}`;
  if (f.policy) return `Policy: ${f.policy.name}`;
  if (f.vendor) return `Vendor: ${f.vendor.name}`;
  if (f.risk) return `Risk: ${f.risk.title}`;
  if (f.member) return `Person: ${f.member.user.name || f.member.user.email}`;
  if (f.device) return `Device: ${f.device.name || f.device.hostname}`;
  if (f.evidenceSubmission) return `Evidence: ${f.evidenceSubmission.formType}`;
  if (f.evidenceFormType) return `Form: ${f.evidenceFormType}`;
  if (f.area) return `Area: ${f.area}`;
  return '—';
}

export function FindingsTab({ orgId }: { orgId: string }) {
  const [findings, setFindings] = useState<AdminFinding[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const fetchFindings = useCallback(async () => {
    setLoading(true);
    const res = await api.get<AdminFinding[]>(
      `/v1/admin/organizations/${orgId}/findings`,
    );
    if (res.data) setFindings(res.data);
    setLoading(false);
  }, [orgId]);

  useEffect(() => {
    void fetchFindings();
  }, [fetchFindings]);

  const handleStatusChange = async (findingId: string, newStatus: string) => {
    setUpdatingId(findingId);
    const res = await api.patch(
      `/v1/admin/organizations/${orgId}/findings/${findingId}`,
      { status: newStatus },
    );
    if (!res.error) {
      setFindings((prev) =>
        prev.map((f) => (f.id === findingId ? { ...f, status: newStatus } : f)),
      );
    }
    setUpdatingId(null);
  };

  const adminCreateFn = useCallback(
    async (payload: CreateFindingData) => {
      const res = await api.post(
        `/v1/admin/organizations/${orgId}/findings`,
        payload,
      );
      if (res.error) throw new Error(res.error);
    },
    [orgId],
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12 text-muted-foreground">
        Loading findings...
      </div>
    );
  }

  return (
    <>
      <Section
        title={`Findings (${findings.length})`}
        actions={
          <Button size="sm" iconLeft={<Add size={16} />} onClick={() => setShowForm(true)}>
            Log Finding
          </Button>
        }
      >
        {findings.length === 0 ? (
          <div className="rounded-lg border border-dashed py-8 text-center text-sm text-muted-foreground">
            No findings for this organization.
          </div>
        ) : (
          <Table variant="bordered">
            <TableHeader>
              <TableRow>
                <TableHead>Content</TableHead>
                <TableHead>Target</TableHead>
                <TableHead>Severity</TableHead>
                <TableHead>Created By</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {[...findings]
                .sort((a, b) => a.content.localeCompare(b.content))
                .map((finding) => (
                  <TableRow key={finding.id}>
                    <TableCell>
                      <div className="max-w-[400px] truncate">
                        <Text size="sm">{finding.content}</Text>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Text size="sm" variant="muted">
                        {getTargetLabel(finding)}
                      </Text>
                    </TableCell>
                    <TableCell>
                      <Badge variant={SEVERITY_VARIANT[finding.severity] ?? 'secondary'}>
                        {finding.severity}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Text size="sm" variant="muted">
                        {getCreatorName(finding)}
                      </Text>
                    </TableCell>
                    <TableCell>
                      <Select
                        value={finding.status}
                        onValueChange={(val) => {
                          if (val) void handleStatusChange(finding.id, val);
                        }}
                        disabled={updatingId === finding.id}
                      >
                        <SelectTrigger size="sm">
                          <Badge variant={STATUS_VARIANT[finding.status] ?? 'default'}>
                            {formatStatus(finding.status)}
                          </Badge>
                        </SelectTrigger>
                        <SelectContent alignItemWithTrigger={false}>
                          {STATUS_OPTIONS.map((s) => (
                            <SelectItem key={s} value={s}>
                              {formatStatus(s)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        )}
      </Section>

      <CreateFindingSheet
        organizationId={orgId}
        open={showForm}
        onOpenChange={setShowForm}
        createFn={adminCreateFn}
        // Route picker queries to the admin org-scoped endpoints so we fetch
        // the target org's tasks/policies/vendors/etc. instead of the platform
        // admin's own session org. Target kinds without an admin-scoped
        // endpoint (risk, member, device) are hidden from the dropdown.
        endpointOverrides={{
          task: `/v1/admin/organizations/${orgId}/tasks`,
          policy: `/v1/admin/organizations/${orgId}/policies`,
          vendor: `/v1/admin/organizations/${orgId}/vendors`,
          // Document-type definitions are static metadata, not org-scoped.
          // The admin `/evidence-forms` endpoint returns a status map keyed
          // by form type, which `extractOptions` can't render as picker
          // options — fall back to the default static endpoint.
        }}
        disabledTargetKinds={['risk', 'member', 'device']}
        onSuccess={() => {
          void fetchFindings();
        }}
      />
    </>
  );
}
