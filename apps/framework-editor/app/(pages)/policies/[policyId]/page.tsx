import PageLayout from '@/app/components/PageLayout';
import { serverApi } from '@/app/lib/api-server';
import { isAuthorized } from '@/app/lib/utils';
import '@/styles/editor.css';
import { notFound, redirect } from 'next/navigation';
import { PolicyDetailsClientPage } from './PolicyDetailsClientPage';
import { PolicyEditorClient } from './PolicyEditorClient';

interface PolicyTemplate {
  id: string;
  name: string;
  description: string;
  frequency: string;
  department: string;
  content: unknown;
  createdAt: string;
  updatedAt: string;
}

export default async function PolicyDetailPage({
  params,
}: {
  params: Promise<{ policyId: string }>;
}) {
  const isAllowed = await isAuthorized();
  if (!isAllowed) redirect('/auth');

  const { policyId } = await params;

  let policy: PolicyTemplate;
  try {
    policy = await serverApi<PolicyTemplate>(`/policy-template/${policyId}`);
  } catch {
    notFound();
  }

  return (
    <PageLayout
      breadcrumbs={[
        { label: 'Frameworks', href: '/frameworks' },
        { label: policy.name, href: `/policies/${policy.id}` },
      ]}
    >
      <PolicyDetailsClientPage policy={policy} />
      <PolicyEditorClient
        policyId={policy.id}
        policyName={policy.name}
        initialContent={policy.content}
      />
    </PageLayout>
  );
}
