import PageLayout from '@/app/components/PageLayout';
import { serverApi } from '@/app/lib/api-server';
import { isAuthorized } from '@/app/lib/utils';
import type { FrameworkEditorPolicyTemplate } from '@/db';
import '@/styles/editor.css';
import type { JSONContent } from '@tiptap/react';
import { notFound, redirect } from 'next/navigation';
import { PolicyDetailsClientPage } from './PolicyDetailsClientPage';
import { PolicyEditorClient } from './PolicyEditorClient';

export default async function PolicyDetailPage({
  params,
}: {
  params: Promise<{ policyId: string }>;
}) {
  const isAllowed = await isAuthorized();
  if (!isAllowed) redirect('/auth');

  const { policyId } = await params;

  let policy: FrameworkEditorPolicyTemplate;
  try {
    policy = await serverApi<FrameworkEditorPolicyTemplate>(`/policy-template/${policyId}`);
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
        initialContent={policy.content as JSONContent | JSONContent[] | null}
      />
    </PageLayout>
  );
}
