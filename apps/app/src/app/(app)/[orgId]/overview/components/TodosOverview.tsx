'use client';

import { useApiSWR } from '@/hooks/use-api-swr';
import { Badge, Text } from '@trycompai/design-system';
import { ArrowRight, Checkmark } from '@trycompai/design-system/icons';
import Link from 'next/link';
import { useParams } from 'next/navigation';

interface PendingMember {
  memberId: string;
  name: string;
  email: string;
  image: string | null;
  offboardDate: string;
  completedItems: number;
  totalItems: number;
}

interface PendingResponse {
  members: PendingMember[];
}

export function TodosOverview() {
  const params = useParams<{ orgId: string }>();
  const organizationId = params.orgId;
  const { data, isLoading, error } = useApiSWR<PendingResponse>(
    '/v1/offboarding-checklist/pending',
  );
  const members = data?.data?.members ?? [];

  return (
    <div className="flex h-full flex-col rounded-lg border">
      <div className="flex items-center justify-between border-b px-5 py-4">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">Todos</span>
          {members.length > 0 && (
            <Badge variant="secondary">{members.length}</Badge>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-3">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Text variant="muted">Loading...</Text>
          </div>
        ) : error ? (
          <div className="flex items-center justify-center py-8">
            <Text size="sm" variant="muted">
              Failed to load todos
            </Text>
          </div>
        ) : members.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 py-8">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
              <Checkmark size={16} className="text-primary" />
            </div>
            <Text size="sm" variant="muted">
              All clear — no pending items
            </Text>
          </div>
        ) : (
          <div className="space-y-0">
            {members.map((member, index) => (
              <div key={member.memberId}>
                <div className="flex items-start justify-between px-1 py-3">
                  <div className="flex min-w-0 flex-1 flex-col">
                    <span className="text-sm font-medium">
                      Complete offboarding for {member.name}
                    </span>
                    <span className="text-xs capitalize text-muted-foreground">
                      {member.completedItems}/{member.totalItems} tasks done
                    </span>
                  </div>
                  <Link
                    href={`/${organizationId}/people/${member.memberId}?tab=offboarding`}
                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border transition-colors hover:bg-muted"
                  >
                    <ArrowRight size={14} />
                  </Link>
                </div>
                {index < members.length - 1 && (
                  <div className="border-t border-muted/30" />
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
