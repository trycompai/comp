import { PageHeader, PageLayout } from '@trycompai/design-system';

export default function Loading() {
  return (
    <PageLayout
      loading
      padding="default"
      header={<PageHeader title="Policies" />}
    />
  );
}
