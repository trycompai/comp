import { redirect } from 'next/navigation';

interface ReviewPageProps {
  params: Promise<{ vendorId: string; orgId: string }>;
}

// Redirect to main vendor page - review tab is now part of the consolidated page
export default async function ReviewPage({ params }: ReviewPageProps) {
  const { vendorId, orgId } = await params;
  redirect(`/${orgId}/vendors/${vendorId}`);
}

