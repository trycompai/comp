'use client';

import { Badge, Text } from '@trycompai/design-system';
import Link from 'next/link';
import type { BackgroundCheckStatus } from './backgroundCheckTypes';

type StripStatus = BackgroundCheckStatus | 'not_started' | 'exempt';

interface StatusStripProps {
  status: StripStatus;
  creditsUsed: number;
  creditsIncluded: number;
  planHref: string;
  canManageBilling: boolean;
}

const STATUS_COPY: Record<StripStatus, { label: string; sentence: string }> = {
  not_started: {
    label: 'Not started',
    sentence: 'No check has been initiated for this employee.',
  },
  invited: {
    label: 'Invited',
    sentence: 'The candidate has been invited to complete the check.',
  },
  in_progress: {
    label: 'In progress',
    sentence: 'The candidate is completing their submission.',
  },
  in_review: {
    label: 'In review',
    sentence: 'The submitted check is under review.',
  },
  completed: {
    label: 'Completed',
    sentence: 'The check is complete.',
  },
  completed_with_flags: {
    label: 'Completed with flags',
    sentence: 'The check is complete and contains flags that need review.',
  },
  failed: {
    label: 'Failed',
    sentence: 'The check did not complete successfully.',
  },
  cancelled: {
    label: 'Cancelled',
    sentence: 'The check was cancelled.',
  },
  exempt: {
    label: 'Exempt',
    sentence: 'This employee is exempt from background checks.',
  },
};

export function BackgroundCheckStatusStrip({
  status,
  creditsUsed,
  creditsIncluded,
  planHref,
  canManageBilling,
}: StatusStripProps) {
  const copy = STATUS_COPY[status];
  const remaining = Math.max(0, creditsIncluded - creditsUsed);

  return (
    <div className="mb-6 flex items-center gap-6 rounded-[var(--radius)] border bg-background px-[18px] py-3.5">
      <div className="flex items-center gap-2.5">
        <Badge variant="secondary">
          <span aria-hidden className="size-1.5 rounded-full bg-current opacity-70" />
          {copy.label}
        </Badge>
        <Text size="sm" variant="muted">
          {copy.sentence}
        </Text>
      </div>
      <div className="flex-1" />
      <div className="flex items-center gap-2 text-sm">
        <Text size="sm" variant="muted">
          Credits remaining
        </Text>
        <span className="font-mono tabular-nums">
          {remaining} / {creditsIncluded}
        </span>
        <span aria-hidden className="mx-1 h-3.5 w-px bg-border" />
        {canManageBilling ? (
          <Link
            href={planHref}
            className="text-primary text-sm no-underline hover:underline underline-offset-2"
          >
            Choose a plan →
          </Link>
        ) : (
          <Text size="sm" variant="muted">
            Choose a plan →
          </Text>
        )}
      </div>
    </div>
  );
}
