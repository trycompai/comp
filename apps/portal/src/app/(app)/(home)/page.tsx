import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
  PageHeader,
  PageLayout,
} from '@trycompai/design-system';
import type { Metadata } from 'next';
import { Suspense } from 'react';
import { Overview } from './components/Overview';

export default function HomePage() {
  return (
    <PageLayout>
      <PageHeader title="Employee Portal Overview" />
      <Suspense
        fallback={
          <Empty>
            <EmptyHeader>
              <EmptyTitle>Loading overview...</EmptyTitle>
              <EmptyDescription>Fetching your organizations and tasks.</EmptyDescription>
            </EmptyHeader>
          </Empty>
        }
      >
        <Overview />
      </Suspense>
    </PageLayout>
  );
}

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: 'Employee Portal Overview',
  };
}
