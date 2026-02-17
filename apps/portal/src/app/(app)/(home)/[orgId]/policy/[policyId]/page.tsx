import { auth } from '@/app/lib/auth';
import { db } from '@db';
import {
  Badge,
  Breadcrumb,
  Card,
  CardContent,
  CardFooter,
  PageLayout,
  Stack,
  Text,
} from '@trycompai/design-system';
import { headers } from 'next/headers';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { PolicyAcceptButton } from './PolicyAcceptButton';
import PolicyViewer from './PolicyViewer';

function formatPolicyStatus(status: string): string {
  return status
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(' ');
}

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
    <PageLayout>
      <Breadcrumb
        items={[
          {
            label: 'Overview',
            href: `/${orgId}`,
            props: { render: <Link href={`/${orgId}`} /> },
          },
          { label: policy.name, isCurrent: true },
        ]}
      />
      <Stack gap="md">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-semibold tracking-tight">{policy.name}</h1>
          <Badge variant="secondary">{formatPolicyStatus(policy.status)}</Badge>
        </div>
        {policy.description && (
          <Text variant="muted" size="sm">
            {policy.description}
          </Text>
        )}
        {isAccepted && (
          <div className="rounded-md border border-green-200 bg-green-50 px-4 py-4 sm:px-5 sm:py-4 dark:border-green-800 dark:bg-green-950/30">
            <Text size="sm" weight="medium">
              You have accepted this policy
            </Text>
          </div>
        )}
        <Card>
          <CardContent>
            <Stack gap="md">
              <PolicyViewer policy={policy} />
              {policy.updatedAt && (
                <Text variant="muted" size="sm">
                  Last updated: {new Date(policy.updatedAt).toLocaleDateString()}
                </Text>
              )}
            </Stack>
          </CardContent>
          <CardFooter>
            <PolicyAcceptButton
              policyId={policy.id}
              memberId={member.id}
              isAccepted={isAccepted}
              orgId={orgId}
            />
          </CardFooter>
        </Card>
      </Stack>
    </PageLayout>
  );
}
