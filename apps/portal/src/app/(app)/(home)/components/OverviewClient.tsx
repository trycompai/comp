'use client';

import { apiClient } from '@/lib/api-client';
import { Card, CardContent, CardHeader, CardTitle } from '@trycompai/ui-shadcn';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import useSWR from 'swr';
import { MembershipsResponseSchema, type MembershipsResponse } from '../schemas/memberships';
import { NoAccessMessage } from './NoAccessMessage';

interface OverviewClientProps {
  initialMemberships?: MembershipsResponse;
}

export function OverviewClient({ initialMemberships }: OverviewClientProps) {
  const router = useRouter();
  const { data, error, isLoading } = useSWR(
    'portal-memberships',
    async () => {
      const res = await apiClient.get('/v1/me/organizations');
      if (res.error) throw new Error(res.error);
      return MembershipsResponseSchema.parse(res.data);
    },
    {
      fallbackData: initialMemberships,
      revalidateOnFocus: false,
    },
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

  return (
    <div className="space-y-8">
      <h1 className="text-lg font-semibold">Your Organizations</h1>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {memberships.map((m) => (
          <Link href={`/${m.organization.id}`} key={m.memberId}>
            <Card>
              <CardHeader>
                <CardTitle>{m.organization.name}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">View organization</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
