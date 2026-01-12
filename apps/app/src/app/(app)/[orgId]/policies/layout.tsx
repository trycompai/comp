import { PageHeader, PageLayout } from '@trycompai/design-system';
import { PolicyTabs } from './components/PolicyTabs';

interface LayoutProps {
  children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  return (
    <PageLayout>
      <PageHeader title="Policies" />
      <PolicyTabs />
      {children}
    </PageLayout>
  );
}
