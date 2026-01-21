import Loader from '@/components/ui/loader';
import { PageHeader, PageLayout } from '@trycompai/design-system';

export default function Loading() {
  return (
    <PageLayout loading header={<PageHeader title="Employee" />} padding="default">
      <Loader />
    </PageLayout>
  );
}
