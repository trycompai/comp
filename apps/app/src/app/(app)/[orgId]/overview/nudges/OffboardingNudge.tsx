'use client';

import { useApiSWR } from '@/hooks/use-api-swr';
import { Alert, AlertAction, AlertTitle, Button } from '@trycompai/design-system';
import { Close } from '@trycompai/design-system/icons';
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
    <Alert variant="warning">
      <AlertTitle>
        <span className="text-foreground">
          {`${members.length} employee${members.length !== 1 ? 's' : ''} require${
            members.length === 1 ? 's' : ''
          } offboarding completion`}
        </span>
      </AlertTitle>
      <div className="col-start-2 pt-1">
        <Button render={<Link href={link} />}>View details</Button>
      </div>
      <AlertAction>
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss"
          className="rounded-md p-1 opacity-70 transition-opacity hover:opacity-100"
        >
          <Close size={16} />
        </button>
      </AlertAction>
    </Alert>
  );
}
