'use client';

import { PageHeader, PageLayout, Tabs, TabsList, TabsTrigger } from '@trycompai/design-system';
import { useParams, usePathname, useRouter } from 'next/navigation';

interface LayoutProps {
  children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const params = useParams<{ orgId: string }>();
  const pathname = usePathname();
  const router = useRouter();

  const orgId = params.orgId;

  // Determine active tab based on pathname
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
    <PageLayout maxWidth="xl" padding="none">
      <PageHeader title="Policies" />

      <Tabs value={getActiveTab()} onValueChange={handleTabChange}>
        <TabsList variant="underline">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="policies">Policies</TabsTrigger>
        </TabsList>
      </Tabs>

      {children}
    </PageLayout>
  );
}
