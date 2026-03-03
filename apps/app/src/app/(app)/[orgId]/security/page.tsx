import { redirect } from 'next/navigation';
import type { Metadata } from 'next';

export default async function SecurityPage({ params }: { params: Promise<{ orgId: string }> }) {
  const { orgId } = await params;

  redirect(`/${orgId}/security/penetration-tests`);
}

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: 'Security',
  };
}
