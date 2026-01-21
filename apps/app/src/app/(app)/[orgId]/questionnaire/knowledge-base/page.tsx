import { redirect } from 'next/navigation';

interface KnowledgeBasePageProps {
  params: Promise<{ orgId: string }>;
}

// Redirect to main questionnaire page - Knowledge Base is now a tab
export default async function KnowledgeBasePage({ params }: KnowledgeBasePageProps) {
  const { orgId } = await params;
  redirect(`/${orgId}/questionnaire`);
}
