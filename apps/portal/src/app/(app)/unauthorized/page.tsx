import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
  PageLayout,
} from '@trycompai/design-system';

export default async function Unauthorized() {
  return (
    <PageLayout>
      <Empty>
        <EmptyHeader>
          <EmptyTitle>Organization not found</EmptyTitle>
          <EmptyDescription>
            We couldn't find an organization for your account. Please contact your administrator.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    </PageLayout>
  );
}
