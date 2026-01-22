import { PageHeader, PageLayout } from '@trycompai/design-system';

export default function Loading() {
  return <PageLayout header={<PageHeader title="People" />} loading={true} />;
}
