import { redirect } from 'next/navigation';

interface SOAPageProps {
  params: Promise<{ orgId: string }>;
}

// Redirect to main questionnaire page - SOA is now a tab
export default async function SOAPage({ params }: SOAPageProps) {
  const { orgId } = await params;
  redirect(`/${orgId}/questionnaire`);
}
