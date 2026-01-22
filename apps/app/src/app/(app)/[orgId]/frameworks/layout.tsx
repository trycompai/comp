import { PageHeader, PageLayout } from '@trycompai/design-system';

export default async function Layout({ children }: { children: React.ReactNode }) {
  return (
    <PageLayout header={<PageHeader title="Overview" />} padding="default">
      {children}
    </PageLayout>
  );
}
