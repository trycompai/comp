import { redirect } from 'next/navigation';

interface SOAPageProps {
  params: Promise<{ orgId: string }>;
}

// Redirect to the Statement of Applicability page under Documents.
// SOA was previously a tab on the Questionnaires page; it now lives under Documents.
export default async function SOAPage({ params }: SOAPageProps) {
  const { orgId } = await params;
  redirect(`/${orgId}/documents/statement-of-applicability`);
}
