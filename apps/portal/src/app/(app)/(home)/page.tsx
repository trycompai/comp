import type { Metadata } from 'next';
import { Suspense } from 'react';
import { Overview } from './components/Overview';

interface HomePageProps {
  params: Promise<{}>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default function HomePage({ params, searchParams }: HomePageProps) {
  return (
    <div className="space-y-6">
      {/* Add loading states later if Overview becomes complex */}
      <Suspense fallback={<div>Loading overview...</div>}>
        {/* Pass searchParams to Overview */}
        <Overview />
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
