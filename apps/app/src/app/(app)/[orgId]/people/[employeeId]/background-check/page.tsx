import { serverApi } from '@/lib/server-api-client';
import { auth } from '@/utils/auth';
import type { Member, User } from '@db';
import { db } from '@db/server';
import { PageHeader, PageLayout } from '@trycompai/design-system';
import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { notFound, redirect } from 'next/navigation';
import type {
  BackgroundCheckBillingStatus,
  BackgroundCheckRecord,
} from '../components/backgroundCheckTypes';
import { EmployeeBackgroundCheck } from '../components/EmployeeBackgroundCheck';

export default async function EmployeeBackgroundCheckPage({
  params,
}: {
  params: Promise<{ employeeId: string; orgId: string }>;
}) {
  const { employeeId, orgId } = await params;
  const employee = await getEmployee({ employeeId, orgId });

  if (!employee) {
    notFound();
  }

  const [backgroundCheckRes, backgroundCheckBillingRes, org] = await Promise.all([
    serverApi.get<BackgroundCheckRecord | null>(`/v1/people/${employeeId}/background-check`),
    serverApi.get<BackgroundCheckBillingStatus>('/v1/background-check-billing/status'),
    db.organization.findUnique({
      where: { id: orgId },
      select: { backgroundCheckStepEnabled: true },
    }),
  ]);

  const backgroundCheckStepEnabled = org?.backgroundCheckStepEnabled === true;

  return (
    <PageLayout
      header={
        <PageHeader
          title="Background Check"
          breadcrumbs={[
            { label: 'People', href: `/${orgId}/people` },
            { label: employee.user.name ?? 'Employee', href: `/${orgId}/people/${employeeId}` },
            { label: 'Background Check', isCurrent: true },
          ]}
        />
      }
    >
      <EmployeeBackgroundCheck
        employee={employee}
        organizationId={orgId}
        initialBackgroundCheck={backgroundCheckRes.data ?? null}
        initialBillingStatus={
          backgroundCheckBillingRes.data ?? {
            hasPaymentMethod: false,
            setupAt: null,
          }
        }
        backgroundCheckStepEnabled={backgroundCheckStepEnabled}
        memberBackgroundCheckExempt={employee.backgroundCheckExempt === true}
      />
    </PageLayout>
  );
}

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: 'Employee Background Check',
  };
}

async function getEmployee({
  employeeId,
  orgId,
}: {
  employeeId: string;
  orgId: string;
}): Promise<(Member & { user: User }) | null> {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  const organizationId = session?.session.activeOrganizationId;

  if (!organizationId || organizationId !== orgId) {
    redirect('/');
  }

  return db.member.findFirst({
    where: {
      id: employeeId,
      organizationId,
    },
    include: {
      user: true,
    },
  });
}
