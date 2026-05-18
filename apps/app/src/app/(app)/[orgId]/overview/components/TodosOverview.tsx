'use client';

import { useApiSWR } from '@/hooks/use-api-swr';
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  Badge,
  Stack,
  Text,
} from '@trycompai/design-system';
import { ArrowRight, Checkmark } from '@trycompai/design-system/icons';
import { format } from 'date-fns';
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
  const { data, isLoading } = useApiSWR<PendingResponse>(
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
          <Stack gap="1">
            {members.map((member) => (
              <Link
                key={member.memberId}
                href={`/${organizationId}/people/${member.memberId}?tab=offboarding`}
                className="flex items-center gap-3 rounded-md px-2 py-2.5 transition-colors hover:bg-muted/50"
              >
                <Avatar size="sm">
                  <AvatarImage src={member.image ?? undefined} />
                  <AvatarFallback>
                    {member.name
                      ?.split(' ')
                      .map((n) => n[0])
                      .join('')
                      .toUpperCase() ?? '??'}
                  </AvatarFallback>
                </Avatar>
                <div className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate text-sm font-medium">
                    Complete offboarding for {member.name}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    Offboarded{' '}
                    {format(new Date(member.offboardDate), 'MMM d, yyyy')}
                    {' · '}
                    {member.completedItems}/{member.totalItems} tasks done
                  </span>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <span className="font-mono text-xs tabular-nums text-muted-foreground">
                    {member.completedItems}/{member.totalItems}
                  </span>
                  <ArrowRight size={14} className="text-muted-foreground" />
                </div>
              </Link>
            ))}
          </Stack>
        )}
      </div>
    </div>
  );
}
