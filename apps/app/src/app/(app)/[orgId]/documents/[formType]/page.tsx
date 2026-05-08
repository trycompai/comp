import { CompanyFormPageClient } from '@/app/(app)/[orgId]/documents/components/CompanyFormPageClient';
import { Breadcrumb, PageLayout } from '@trycompai/design-system';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { evidenceFormDefinitions, evidenceFormTypeSchema } from '../forms';
import { auth } from '@/utils/auth';
import { headers } from 'next/headers';

export default async function CompanyFormDetailPage({
  params,
}: {
  params: Promise<{ orgId: string; formType: string }>;
}) {
  const { orgId, formType } = await params;
  const parsedType = evidenceFormTypeSchema.safeParse(formType);

  if (!parsedType.success) {
    notFound();
  }

  const formDefinition = evidenceFormDefinitions[parsedType.data];

  let isPlatformAdmin = false;

  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (session?.user?.id) {
    isPlatformAdmin = session.user.role === 'admin';
  }

  return (
    <PageLayout>
      <Breadcrumb
        items={[
          {
            label: 'Documents',
            href: `/${orgId}/documents`,
            props: { render: <Link href={`/${orgId}/documents`} /> },
          },
          { label: formDefinition.title, isCurrent: true },
        ]}
      />
      <CompanyFormPageClient
        organizationId={orgId}
        formType={parsedType.data}
        isPlatformAdmin={isPlatformAdmin}
      />
    </PageLayout>
  );
}
