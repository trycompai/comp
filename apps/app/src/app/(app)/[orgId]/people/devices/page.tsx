import { redirect } from 'next/navigation';

export default async function DevicesPage({ params }: { params: Promise<{ orgId: string }> }) {
  const { orgId } = await params;
  redirect(`/${orgId}/people`);
}
