import { CompanySubmissionDetailPageClient } from '@/app/(app)/[orgId]/documents/components/CompanySubmissionDetailPageClient';
import { Breadcrumb, PageHeader, PageLayout } from '@trycompai/design-system';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { evidenceFormDefinitions, evidenceFormTypeSchema } from '../../../forms';

export default async function CompanySubmissionDetailPage({
  params,
}: {
  params: Promise<{ orgId: string; formType: string; submissionId: string }>;
}) {
  const { orgId, formType, submissionId } = await params;
  const parsedType = evidenceFormTypeSchema.safeParse(formType);

  if (!parsedType.success) {
    notFound();
  }

  const parsedFormType = parsedType.data;
  const formDefinition = evidenceFormDefinitions[parsedFormType];

  return (
    <PageLayout>
      <Breadcrumb
        items={[
          {
            label: 'Documents',
            href: `/${orgId}/documents`,
            props: { render: <Link href={`/${orgId}/documents`} /> },
          },
          {
            label: formDefinition.title,
            href: `/${orgId}/documents/${parsedFormType}`,
            props: { render: <Link href={`/${orgId}/documents/${parsedFormType}`} /> },
          },
          { label: 'Submission Details', isCurrent: true },
        ]}
      />
      <PageHeader title={`${formDefinition.title} Submission`} />
      <CompanySubmissionDetailPageClient
        organizationId={orgId}
        formType={parsedFormType}
        submissionId={submissionId}
      />
    </PageLayout>
  );
}
