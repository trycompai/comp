import { CompanyFormPageClient } from '@/app/(app)/[orgId]/company/components/CompanyFormPageClient';
import { Breadcrumb, PageLayout } from '@trycompai/design-system';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { evidenceFormDefinitions, evidenceFormTypeSchema } from '../forms';

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

  return (
    <PageLayout>
      <Breadcrumb
        items={[
          {
            label: 'Company',
            href: `/${orgId}/company`,
            props: { render: <Link href={`/${orgId}/company`} /> },
          },
          { label: formDefinition.title, isCurrent: true },
        ]}
      />
      <CompanyFormPageClient organizationId={orgId} formType={parsedType.data} />
    </PageLayout>
  );
}
