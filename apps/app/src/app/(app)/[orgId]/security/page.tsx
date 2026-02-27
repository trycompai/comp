import { redirect } from 'next/navigation';
import type { Metadata } from 'next';

export default async function SecurityPage({ params }: { params: Promise<{ orgId: string }> }) {
  const { orgId } = await params;

  redirect(`/${orgId}/security/vulnerability-reports`);
}

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: 'Security',
  };
}
