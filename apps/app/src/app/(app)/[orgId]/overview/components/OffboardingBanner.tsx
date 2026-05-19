'use client';

import { useApiSWR } from '@/hooks/use-api-swr';
import { WarningAlt, Close } from '@trycompai/design-system/icons';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useState } from 'react';

interface PendingMember {
  memberId: string;
  name: string;
}

interface PendingResponse {
  members: PendingMember[];
}

export function OffboardingBanner() {
  const params = useParams<{ orgId: string }>();
  const { data } = useApiSWR<PendingResponse>(
    '/v1/offboarding-checklist/pending',
  );
  const members = data?.data?.members ?? [];
  const [dismissed, setDismissed] = useState(false);

  if (dismissed || members.length === 0) return null;

  const firstMember = members[0];

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
          href={`/${params.orgId}/people/${firstMember.memberId}?tab=offboarding`}
          className="rounded-md px-3 py-1 text-sm font-medium text-amber-700 transition-colors hover:bg-amber-100"
        >
          View details
        </Link>
        <button
          type="button"
          onClick={() => setDismissed(true)}
          className="rounded-md p-1 text-amber-600 transition-colors hover:bg-amber-100"
        >
          <Close size={16} />
        </button>
      </div>
    </div>
  );
}
