import { auth } from '@/app/lib/auth';
import { db } from '@db/server';
import {
  Breadcrumb,
  Card,
  CardContent,
  PageHeader,
  PageLayout,
  Stack,
  Text,
} from '@trycompai/design-system';
import { Document } from '@trycompai/design-system/icons';
import { headers } from 'next/headers';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { sortPoliciesByName } from '../components/policy/sort-policies-by-name';

export default async function SignedPoliciesPage({
  params,
}: {
  params: Promise<{ orgId: string }>;
}) {
  const { orgId } = await params;

  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    redirect('/auth');
  }

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

  const policies = sortPoliciesByName(
    await db.policy.findMany({
      where: {
        organizationId: orgId,
        status: 'published',
        isRequiredToSign: true,
        isArchived: false,
        signedBy: { has: member.id },
      },
      select: {
        id: true,
        name: true,
        description: true,
        updatedAt: true,
      },
    }),
  );

  return (
    <PageLayout>
      <Breadcrumb
        items={[
          {
            label: 'Overview',
            href: `/${orgId}`,
            props: { render: <Link href={`/${orgId}`} /> },
          },
          { label: 'Signed Policies', isCurrent: true },
        ]}
      />
      <Stack gap="md">
        <PageHeader title="Signed Policies" />
        {policies.length === 0 ? (
          <Text variant="muted" size="sm">
            No signed policies yet.
          </Text>
        ) : (
          <div className="space-y-2">
            {policies.map((policy) => (
              <Link
                key={policy.id}
                href={`/${orgId}/policy/${policy.id}`}
                className="block"
              >
                <Card>
                  <CardContent>
                    <div className="flex items-center gap-3">
                      <div className="text-muted-foreground">
                        <Document size={20} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <Text size="sm" weight="medium">
                          {policy.name}
                        </Text>
                        {policy.description && (
                          <Text variant="muted" size="sm">
                            {policy.description}
                          </Text>
                        )}
                      </div>
                      <Text variant="muted" size="sm">
                        {new Date(policy.updatedAt).toLocaleDateString()}
                      </Text>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </Stack>
    </PageLayout>
  );
}
