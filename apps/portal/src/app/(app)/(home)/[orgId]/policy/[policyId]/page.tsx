import { auth } from '@/app/lib/auth';
import { db } from '@db';
import { Badge, PageHeader, PageLayout } from '@trycompai/design-system';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { PolicyAcceptButton } from './PolicyAcceptButton';
import PolicyViewer from './PolicyViewer';

export default async function PolicyPage({
  params,
}: {
  params: Promise<{ policyId: string; orgId: string }>;
}) {
  const { policyId, orgId } = await params;

  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    redirect('/auth');
  }

  const policy = await db.policy.findUnique({
    where: { id: policyId },
    include: {
      currentVersion: {
        select: {
          id: true,
          content: true,
          pdfUrl: true,
          version: true,
        },
      },
    },
  });

  if (!policy) {
    redirect(`/${orgId}`);
  }

  // Get the member info for the current org
  const member = await db.member.findFirst({
    where: {
      userId: session.user.id,
      organizationId: orgId,
      deactivated: false,
    },
  });

  if (!member) {
    redirect('/');
  }

  const isAccepted = policy.signedBy.includes(member.id);

  return (
    <PageLayout
      padding="lg"
      header={
        <PageHeader
          title={policy.name}
          description={policy.description ?? undefined}
          breadcrumbs={[
            { label: 'Overview', href: `/${orgId}` },
            { label: policy.name, isCurrent: true },
          ]}
          actions={isAccepted ? <Badge variant="default">Accepted</Badge> : undefined}
        />
      }
    >
      <div className="space-y-6">
        <PolicyViewer policy={policy} />

        {policy.updatedAt && (
          <p className="text-muted-foreground text-sm">
            Last updated: {new Date(policy.updatedAt).toLocaleDateString()}
          </p>
        )}

        <PolicyAcceptButton
          policyId={policy.id}
          memberId={member.id}
          isAccepted={isAccepted}
          orgId={orgId}
        />
      </div>
    </PageLayout>
  );
}
