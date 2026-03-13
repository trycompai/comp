'use client';

import { api } from '@/lib/api-client';
import {
  Badge,
  Button,
  Section,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Text,
} from '@trycompai/design-system';
import { ArrowLeft, View } from '@trycompai/design-system/icons';
import { useCallback, useEffect, useState } from 'react';

interface FormStatus {
  lastSubmittedAt: string | null;
}

interface Submission {
  id: string;
  formType: string;
  submittedAt: string;
  status: string;
  submittedBy?: { name: string; email: string } | null;
  data: Record<string, unknown>;
}

interface FormDefinition {
  type: string;
  title: string;
  description?: string;
  category?: string;
  fields?: Array<{ key: string; label: string }>;
}

interface FormDetail {
  form: FormDefinition;
  submissions: Submission[];
  total: number;
}

export function EvidenceTab({ orgId }: { orgId: string }) {
  const [statuses, setStatuses] = useState<Record<string, FormStatus>>({});
  const [loading, setLoading] = useState(true);
  const [selectedFormType, setSelectedFormType] = useState<string | null>(null);

  const fetchStatuses = useCallback(async () => {
    setLoading(true);
    const res = await api.get<Record<string, FormStatus>>(
      `/v1/admin/organizations/${orgId}/evidence-forms`,
    );
    if (res.data) setStatuses(res.data);
    setLoading(false);
  }, [orgId]);

  useEffect(() => {
    void fetchStatuses();
  }, [fetchStatuses]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12 text-muted-foreground">
        Loading evidence forms...
      </div>
    );
  }

  if (selectedFormType) {
    return (
      <FormSubmissions
        orgId={orgId}
        formType={selectedFormType}
        onBack={() => setSelectedFormType(null)}
      />
    );
  }

  const formTypes = Object.entries(statuses).sort(([a], [b]) => a.localeCompare(b));

  return (
    <Section title={`Evidence Forms (${formTypes.length})`}>
      {formTypes.length === 0 ? (
        <div className="rounded-lg border border-dashed py-8 text-center text-sm text-muted-foreground">
          No evidence forms available.
        </div>
      ) : (
        <Table variant="bordered">
          <TableHeader>
            <TableRow>
              <TableHead>Form Type</TableHead>
              <TableHead>Last Submitted</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {formTypes.map(([formType, status]) => (
              <TableRow key={formType}>
                <TableCell>
                  <Text size="sm" weight="medium">
                    {formatFormType(formType)}
                  </Text>
                </TableCell>
                <TableCell>
                  {status.lastSubmittedAt ? (
                    <Text size="sm" variant="muted">
                      {new Date(status.lastSubmittedAt).toLocaleDateString()}
                    </Text>
                  ) : (
                    <Badge variant="outline">No submissions</Badge>
                  )}
                </TableCell>
                <TableCell>
                  <Button
                    size="sm"
                    variant="outline"
                    iconLeft={<View size={16} />}
                    onClick={() => setSelectedFormType(formType)}
                  >
                    View
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </Section>
  );
}

function FormSubmissions({
  orgId,
  formType,
  onBack,
}: {
  orgId: string;
  formType: string;
  onBack: () => void;
}) {
  const [detail, setDetail] = useState<FormDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDetail = async () => {
      setLoading(true);
      const res = await api.get<FormDetail>(
        `/v1/admin/organizations/${orgId}/evidence-forms/${formType}`,
      );
      if (res.data) setDetail(res.data);
      setLoading(false);
    };
    void fetchDetail();
  }, [orgId, formType]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12 text-muted-foreground">
        Loading submissions...
      </div>
    );
  }

  if (!detail) {
    return (
      <div className="py-8 text-center text-muted-foreground">
        Failed to load form details.
      </div>
    );
  }

  const formTitle = detail.form?.title ?? formatFormType(formType);

  return (
    <Stack gap="lg">
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="sm"
          iconLeft={<ArrowLeft size={16} />}
          onClick={onBack}
        >
          Back
        </Button>
      </div>

      <Section title={`${formTitle} (${detail.total} submissions)`}>
        {detail.submissions.length === 0 ? (
          <div className="rounded-lg border border-dashed py-8 text-center text-sm text-muted-foreground">
            No submissions for this form type.
          </div>
        ) : (
          <Table variant="bordered">
            <TableHeader>
              <TableRow>
                <TableHead>Submitted By</TableHead>
                <TableHead>Submitted At</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {detail.submissions.map((sub) => (
                <TableRow key={sub.id}>
                  <TableCell>
                    <Text size="sm">
                      {sub.submittedBy?.name || sub.submittedBy?.email || 'Unknown'}
                    </Text>
                  </TableCell>
                  <TableCell>
                    <Text size="sm" variant="muted">
                      {new Date(sub.submittedAt).toLocaleString()}
                    </Text>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        sub.status === 'approved'
                          ? 'default'
                          : sub.status === 'rejected'
                            ? 'destructive'
                            : 'outline'
                      }
                    >
                      {sub.status.replace(/\b\w/g, (c) => c.toUpperCase())}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Section>
    </Stack>
  );
}

function formatFormType(type: string): string {
  return type
    .replace(/-/g, ' ')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}
