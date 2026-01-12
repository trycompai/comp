'use client';

import { Tabs, TabsList, TabsTrigger } from '@trycompai/design-system';
import { useParams, usePathname, useRouter } from 'next/navigation';

export function PolicyTabs() {
  const params = useParams<{ orgId: string }>();
  const pathname = usePathname();
  const router = useRouter();

  const orgId = params.orgId;

  const getActiveTab = () => {
    if (pathname?.includes('/policies/all') || pathname?.includes('/policies/pol_')) {
      return 'policies';
    }
    return 'overview';
  };

  const handleTabChange = (value: string | number | null) => {
    if (value === 'overview') {
      router.push(`/${orgId}/policies`);
    } else if (value === 'policies') {
      router.push(`/${orgId}/policies/all`);
    }
  };

  return (
    <Tabs value={getActiveTab()} onValueChange={handleTabChange}>
      <TabsList variant="underline">
        <TabsTrigger value="overview">Overview</TabsTrigger>
        <TabsTrigger value="policies">Policies</TabsTrigger>
      </TabsList>
    </Tabs>
  );
}
