import { serverApiNoOrg } from '@/lib/server-api-client';
import type { Metadata } from 'next';
import { Suspense } from 'react';
import { Overview } from './components/Overview';
import { MembershipsResponseSchema, type MembershipsResponse } from './schemas/memberships';

export default async function HomePage() {
  const initialMemberships: MembershipsResponse | undefined = await serverApiNoOrg
    .get('/v1/me/organizations')
    .then((res) => {
      if (res.error || !res.data) return undefined;
      return MembershipsResponseSchema.parse(res.data);
    })
    .catch(() => undefined);

  return (
    <div className="space-y-6">
      {/* Add loading states later if Overview becomes complex */}
      <Suspense fallback={<div>Loading overview...</div>}>
        {/* Pass searchParams to Overview */}
        <Overview initialMemberships={initialMemberships} />
      </Suspense>
      {/* Other home page sections can go here */}
    </div>
  );
}

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: 'Employee Portal Overview',
  };
}
