import PageLayout from '@/app/components/PageLayout';
import { db } from '@comp/db';
import { notFound, redirect } from 'next/navigation';
// import { Card, CardContent, CardHeader, CardTitle } from "@comp/ui/card"; // No longer needed here
import { PolicyEditorClient } from './PolicyEditorClient';
import { PolicyDetailsClientPage } from './PolicyDetailsClientPage'; // Import the new client component
import '@comp/ui/editor.css';
import { isAuthorized } from '@/app/lib/utils';

interface PolicyDetailPageProps {
  params: Promise<{
    policyId: string;
  }>;
}

export default async function PolicyDetailPage({ params }: PolicyDetailPageProps) {
  const isAllowed = await isAuthorized();

  if (!isAllowed) {
    redirect('/auth');
  }

  const { policyId } = await params;

  const policy = await db.frameworkEditorPolicyTemplate.findUnique({
    where: { id: policyId },
  });

  if (!policy) {
    notFound();
  }

  // console.log("Policy Content from DB (Server):", JSON.stringify(policy.content, null, 2));

  return (
    <PageLayout
      breadcrumbs={[
        { label: 'Policies', href: '/policies' },
        { label: policy.name, href: `/policies/${policy.id}` },
      ]}
    >
      {/* Use the new client component for displaying policy details and action buttons */}
      <PolicyDetailsClientPage policy={policy} />

      {/* The Editor Client Component remains */}
      <PolicyEditorClient
        policyId={policy.id}
        policyName={policy.name}
        initialContent={policy.content as any}
      />
    </PageLayout>
  );
}
