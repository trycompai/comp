import { auth } from '@/app/lib/auth';
import { env } from '@/env.mjs';
import { db } from '@db/server';
import { Breadcrumb, PageLayout } from '@trycompai/design-system';
import { headers as getHeaders } from 'next/headers';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { evidenceFormDefinitions, evidenceFormTypeSchema } from '../../forms';
import { PortalSubmissionsClient } from './PortalSubmissionsClient';

type SubmissionRow = {
  id: string;
  formType: string;
  submittedAt: string;
  status: string;
  reviewReason: string | null;
  reviewedAt: string | null;
  data: Record<string, unknown>;
  reviewedBy?: {
    name: string | null;
    email: string;
  } | null;
};

export default async function PortalSubmissionsPage({
  params,
  searchParams,
}: {
  params: Promise<{ orgId: string; formType: string }>;
  searchParams: Promise<{ success?: string }>;
}) {
  const { orgId, formType } = await params;
  const queryParams = await searchParams;
  const parsedType = evidenceFormTypeSchema.safeParse(formType);
  if (!parsedType.success) {
    notFound();
  }

  const formTypeValue = parsedType.data;
  const form = evidenceFormDefinitions[formTypeValue];
  if (!form.portalAccessible) {
    notFound();
  }

  const organization = await db.organization.findUnique({
    where: { id: orgId },
    select: {
      whistleblowerReportEnabled: true,
      accessRequestFormEnabled: true,
    },
  });
  if (!organization) {
    notFound();
  }
  if (formTypeValue === 'whistleblower-report' && !organization.whistleblowerReportEnabled) {
    notFound();
  }
  if (formTypeValue === 'access-request' && !organization.accessRequestFormEnabled) {
    notFound();
  }

  const reqHeaders = await getHeaders();
  const session = await auth.api.getSession({ headers: reqHeaders });

  if (!session?.user?.id) {
    redirect('/auth');
  }

  const apiUrl = env.NEXT_PUBLIC_API_URL || 'http://localhost:3333';
  const cookie = reqHeaders.get('cookie') ?? '';

  const apiHeaders = {
    'Content-Type': 'application/json',
    Cookie: cookie,
  };

  let submissions: SubmissionRow[] = [];

  if (cookie) {
    try {
      const res = await fetch(
        `${apiUrl}/v1/evidence-forms/my-submissions?formType=${formTypeValue}`,
        {
          method: 'GET',
          headers: apiHeaders,
          cache: 'no-store',
        },
      );

      if (res.ok) {
        submissions = await res.json();
      }
    } catch {
      // Silently fail - show empty list
    }
  }

  // Serialize only what the client component needs
  const serializedSubmissions = submissions.map((s) => ({
    id: s.id,
    submittedAt: s.submittedAt,
    status: s.status,
    reviewReason: s.reviewReason,
  }));

  return (
    <PageLayout>
      <Breadcrumb
        items={[
          {
            label: 'Employee Portal',
            href: `/${orgId}`,
            props: { render: <Link href={`/${orgId}`} /> },
          },
          {
            label: form.title,
            href: `/${orgId}/documents/${formTypeValue}`,
            props: { render: <Link href={`/${orgId}/documents/${formTypeValue}`} /> },
          },
          { label: 'My Submissions', isCurrent: true },
        ]}
      />
      <PortalSubmissionsClient
        orgId={orgId}
        formType={formTypeValue}
        formTitle={form.title}
        submissions={serializedSubmissions}
        showSuccess={queryParams.success === '1'}
      />
    </PageLayout>
  );
}
