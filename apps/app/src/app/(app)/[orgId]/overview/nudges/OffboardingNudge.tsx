'use client';

import { useApiSWR } from '@/hooks/use-api-swr';
import { Close, WarningAlt } from '@trycompai/design-system/icons';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import type { NudgeState } from './types';

interface PendingMember {
  memberId: string;
  name: string;
}

interface PendingResponse {
  members: PendingMember[];
}

export function useOffboardingNudge(): NudgeState {
  const { orgId } = useParams<{ orgId: string }>();
  const { data, error } = useApiSWR<PendingResponse>(
    '/v1/offboarding-checklist/pending',
  );
  const members = data?.data?.members ?? [];

  return {
    id: 'offboarding',
    priority: 10,
    persistDismissal: false,
    ready: data !== undefined || error !== undefined,
    eligible: !error && members.length > 0,
    render: (onDismiss) => (
      <OffboardingNudgeView orgId={orgId} members={members} onDismiss={onDismiss} />
    ),
  };
}

function OffboardingNudgeView({
  orgId,
  members,
  onDismiss,
}: {
  orgId: string;
  members: PendingMember[];
  onDismiss: () => void;
}) {
  const link =
    members.length === 1
      ? `/${orgId}/people/${members[0].memberId}?tab=offboarding`
      : `/${orgId}/people`;

  return (
    <div className="flex items-center justify-between rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
      <div className="flex items-center gap-3">
        <WarningAlt size={18} className="shrink-0 text-amber-600" />
        <span className="text-sm">
          <strong>
            {members.length} employee{members.length !== 1 ? 's' : ''}
          </strong>{' '}
          require{members.length === 1 ? 's' : ''} offboarding completion
        </span>
      </div>
      <div className="flex items-center gap-2">
        <Link
          href={link}
          className="rounded-md px-3 py-1 text-sm font-medium text-amber-700 transition-colors hover:bg-amber-100"
        >
          View details
        </Link>
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss"
          className="rounded-md p-1 text-amber-600 transition-colors hover:bg-amber-100"
        >
          <Close size={16} />
        </button>
      </div>
    </div>
  );
}
