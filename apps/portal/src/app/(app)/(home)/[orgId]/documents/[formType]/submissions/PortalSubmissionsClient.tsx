'use client';

import {
  Button,
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
  PageHeader,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Text,
} from '@trycompai/design-system';
import Link from 'next/link';

type SubmissionRow = {
  id: string;
  submittedAt: string;
  status: string;
  reviewReason: string | null;
};

interface PortalSubmissionsClientProps {
  orgId: string;
  formType: string;
  formTitle: string;
  submissions: SubmissionRow[];
  showSuccess: boolean;
}

function StatusBadge({ status }: { status: string }) {
  switch (status) {
    case 'approved':
      return (
        <span className="inline-flex items-center rounded-full bg-green-50 px-2 py-0.5 text-xs font-medium text-green-700 dark:bg-green-950/30 dark:text-green-400">
          Approved
        </span>
      );
    case 'rejected':
      return (
        <span className="inline-flex items-center rounded-full bg-red-50 px-2 py-0.5 text-xs font-medium text-red-700 dark:bg-red-950/30 dark:text-red-400">
          Rejected
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center rounded-full bg-yellow-50 px-2 py-0.5 text-xs font-medium text-yellow-700 dark:bg-yellow-950/30 dark:text-yellow-400">
          Pending
        </span>
      );
  }
}

const dateFormatter = new Intl.DateTimeFormat('en-US', {
  month: '2-digit',
  day: '2-digit',
  year: 'numeric',
});

function formatDate(value: unknown): string {
  if (typeof value !== 'string') return '—';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '—';
  return dateFormatter.format(parsed);
}

export function PortalSubmissionsClient({
  orgId,
  formType,
  formTitle,
  submissions,
  showSuccess,
}: PortalSubmissionsClientProps) {
  return (
    <Stack gap="lg">
      <PageHeader title={`My ${formTitle} Submissions`} />
      <Text variant="muted">
        View the status of your submitted {formTitle.toLowerCase()} forms.
      </Text>

      {showSuccess && (
        <div className="rounded-md border border-green-300 bg-green-50 p-3 text-sm text-green-700 dark:border-green-800 dark:bg-green-950/30 dark:text-green-400">
          Submission saved successfully. It is now pending review.
        </div>
      )}

      {submissions.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyTitle>No submissions yet</EmptyTitle>
            <EmptyDescription>You have no submissions for this form yet.</EmptyDescription>
          </EmptyHeader>
          <div className="mt-4">
            <Link href={`/${orgId}/documents/${formType}`}>
              <Button>Create Submission</Button>
            </Link>
          </div>
        </Empty>
      ) : (
        <Table variant="bordered">
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Review Reason</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {submissions.map((submission) => (
              <TableRow key={submission.id}>
                <TableCell>{formatDate(submission.submittedAt)}</TableCell>
                <TableCell>
                  <StatusBadge status={submission.status} />
                </TableCell>
                <TableCell>
                  <span className="text-muted-foreground text-sm">
                    {submission.reviewReason || '—'}
                  </span>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <div className="flex items-center gap-3">
        <Link href={`/${orgId}/documents/${formType}`}>
          <Button>New Submission</Button>
        </Link>
      </div>
    </Stack>
  );
}
