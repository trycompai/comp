import { getI18n } from '@/app/locales/server';
import type { Metadata } from 'next';
import { setStaticParamsLocale } from 'next-international/server';
import { Overview } from './components/Overview';
import { Suspense } from 'react';

interface HomePageProps {
  params: Promise<{ locale: string }>;
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

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  setStaticParamsLocale(locale);
  const t = await getI18n();

  return {
    title: t('sidebar.dashboard'),
  };
}
