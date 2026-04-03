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
import { Add } from '@trycompai/design-system/icons';
import { useCallback, useEffect, useState } from 'react';
import { FindingForm } from './FindingForm';

interface Finding {
  id: string;
  type: string;
  status: string;
  content: string;
  createdAt: string;
  createdBy?: {
    user?: { name: string; email: string };
  } | null;
  createdByAdmin?: { name: string; email: string } | null;
  task?: { id: string; title: string } | null;
  evidenceSubmission?: { id: string; formType: string } | null;
  evidenceFormType?: string | null;
}

const STATUS_OPTIONS = ['open', 'ready_for_review', 'needs_revision', 'closed'];

const STATUS_VARIANT: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  open: 'destructive',
  ready_for_review: 'outline',
  needs_revision: 'secondary',
  closed: 'default',
};

function formatStatus(status: string) {
  return status
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function getCreatorName(finding: Finding): string {
  return (
    finding.createdBy?.user?.name ||
    finding.createdBy?.user?.email ||
    finding.createdByAdmin?.name ||
    finding.createdByAdmin?.email ||
    'Unknown'
  );
}

export function FindingsTab({ orgId }: { orgId: string }) {
  const [findings, setFindings] = useState<Finding[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const fetchFindings = useCallback(async () => {
    setLoading(true);
    const res = await api.get<Finding[]>(
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

  const handleCreated = () => {
    setShowForm(false);
    void fetchFindings();
  };

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
          <Button
            size="sm"
            iconLeft={<Add size={16} />}
            onClick={() => setShowForm(true)}
          >
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
                <TableHead>Created By</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {[...findings].sort((a, b) => a.content.localeCompare(b.content)).map((finding) => (
                <TableRow key={finding.id}>
                  <TableCell>
                    <div className="max-w-[400px] truncate">
                      <Text size="sm">
                        {finding.content}
                      </Text>
                    </div>
                  </TableCell>
                  <TableCell>
                    <FindingTarget finding={finding} />
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
                        <Badge
                          variant={
                            STATUS_VARIANT[finding.status] ?? 'default'
                          }
                        >
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

      <Sheet open={showForm} onOpenChange={setShowForm}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>Log Finding</SheetTitle>
          </SheetHeader>
          <SheetBody>
            <FindingForm orgId={orgId} onCreated={handleCreated} />
          </SheetBody>
        </SheetContent>
      </Sheet>
    </>
  );
}

function FindingTarget({ finding }: { finding: Finding }) {
  if (finding.task) {
    return (
      <Text size="sm" variant="muted">
        Task: {finding.task.title}
      </Text>
    );
  }
  if (finding.evidenceSubmission) {
    return (
      <Text size="sm" variant="muted">
        Evidence: {finding.evidenceSubmission.formType}
      </Text>
    );
  }
  if (finding.evidenceFormType) {
    return (
      <Text size="sm" variant="muted">
        Form: {finding.evidenceFormType}
      </Text>
    );
  }
  return (
    <Text size="sm" variant="muted">
      --
    </Text>
  );
}
