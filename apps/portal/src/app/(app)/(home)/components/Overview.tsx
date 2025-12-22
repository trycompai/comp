'use client';

import { apiClient } from '@/lib/api-client';
import { Card, Text } from '@trycompai/ui-v2';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import useSWR from 'swr';
import { z } from 'zod';
import { NoAccessMessage } from './NoAccessMessage';

const MembershipsResponseSchema = z.object({
  data: z.array(
    z.object({
      memberId: z.string(),
      role: z.string().optional(),
      organization: z.object({
        id: z.string(),
        name: z.string(),
      }),
    }),
  ),
});

export function Overview() {
  const router = useRouter();
  const { data, error, isLoading } = useSWR(
    'portal-memberships',
    async () => {
      const res = await apiClient.get<unknown>('/v1/me/organizations');
      if (res.error) throw new Error(res.error);
      return MembershipsResponseSchema.parse(res.data);
    },
    { revalidateOnFocus: false },
  );

  if (isLoading) return null;
  if (error || !data) return <NoAccessMessage />;

  const memberships = data.data;
  if (memberships.length === 0) {
    return <NoAccessMessage message="You don't seem to belong to any organizations currently." />;
  }

  if (memberships.length === 1) {
    router.replace(`/${memberships[0].organization.id}`);
    return null;
  }

  // Render a dashboard for each valid membership
  return (
    <div className="space-y-8">
      <h1>Your Organizations</h1>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {memberships.map((m) => (
          <Link href={`/${m.organization.id}`} key={m.memberId}>
            <Card.Root>
              <Card.Header>
                <Card.Title>{m.organization.name}</Card.Title>
              </Card.Header>
              <Card.Body>
                <Text fontSize="sm" color="fg.muted">
                  View organization
                </Text>
              </Card.Body>
            </Card.Root>
          </Link>
        ))}
      </div>
    </div>
  );
}
