import { redirect } from 'next/navigation';

interface ControlsPageProps {
  params: Promise<{ orgId: string }>;
}

export default async function ControlsPage({ params }: ControlsPageProps) {
  const { orgId } = await params;
  redirect(`/${orgId}/overview`);
}
