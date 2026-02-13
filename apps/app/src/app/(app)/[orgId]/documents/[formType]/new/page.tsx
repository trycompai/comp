import { CompanySubmissionWizard } from '@/app/(app)/[orgId]/documents/components/CompanySubmissionWizard';
import { Breadcrumb, PageHeader, PageLayout, Text } from '@trycompai/design-system';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { evidenceFormDefinitions, evidenceFormTypeSchema } from '../../forms';

const conciseFormDescriptions: Record<string, string> = {
  'board-meeting': 'Hold a board meeting and capture minutes.',
  'it-leadership-meeting': 'Run an IT leadership meeting and document outcomes.',
  'risk-committee-meeting': 'Conduct a risk committee meeting and record decisions.',
  'access-request': 'Track and retain user access requests.',
  'whistleblower-report': 'Submit a confidential whistleblower report.',
  'penetration-test': 'Upload a third-party penetration test report.',
};

export default async function NewCompanySubmissionPage({
  params,
}: {
  params: Promise<{ orgId: string; formType: string }>;
}) {
  const { orgId, formType } = await params;
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
          { label: 'New Submission', isCurrent: true },
        ]}
      />
      <PageHeader title={`New ${formDefinition.title} Submission`} />
      <div className="space-y-6">
        <Text variant="muted">
          {conciseFormDescriptions[parsedFormType] ?? formDefinition.description}
        </Text>
        <CompanySubmissionWizard organizationId={orgId} formType={parsedFormType} />
      </div>
    </PageLayout>
  );
}
