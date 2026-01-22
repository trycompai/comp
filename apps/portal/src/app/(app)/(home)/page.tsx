import type { Metadata } from 'next';
import { Suspense } from 'react';
import { Overview } from './components/Overview';

export default function HomePage() {
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
