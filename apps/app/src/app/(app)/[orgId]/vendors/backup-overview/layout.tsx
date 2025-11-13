import { AppOnboarding } from '@/components/app-onboarding';
import { getServersideSession } from '@/lib/get-session';
import { SecondaryMenu } from '@comp/ui/secondary-menu';
import { db } from '@db';
import { headers } from 'next/headers';
import { Suspense, cache } from 'react';
import { CreateVendorSheet } from '../components/create-vendor-sheet';

export default async function Layout({ children }: { children: React.ReactNode }) {
  const {
    session: { activeOrganizationId },
  } = await getServersideSession({
    headers: await headers(),
  });

  const orgId = activeOrganizationId;
  const overview = await getVendorOverview();
  const assignees = await getAssignees();

  if (overview?.vendors === 0) {
    return (
      <div className="m-auto max-w-[1200px]">
        <Suspense fallback={<div>Loading...</div>}>
          <div className="mt-8">
            <AppOnboarding
              title={'Vendor Management'}
              description={
                "Manage your vendors and ensure your organization's supply chain is secure and compliant."
              }
              cta={'Add vendor'}
              imageSrcDark="/onboarding/vendor-management.webp"
              imageSrcLight="/onboarding/vendor-management-light.webp"
              imageAlt="Vendor Management"
              sheetName="createVendorSheet"
              faqs={[
                {
                  questionKey: 'What is vendor management?',
                  answerKey:
                    'Vendor management is the process of managing, and controlling relationships and agreements with third-party suppliers of goods and services.',
                },
                {
                  questionKey: 'Why is vendor management important?',
                  answerKey:
                    'It helps to ensure that you are getting the most value from your vendors, while also minimizing risks and maintaining compliance.',
                },
                {
                  questionKey: 'What are the key steps in vendor management?',
                  answerKey:
                    'The key steps include vendor selection, contract negotiation, performance monitoring, risk management, and relationship management.',
                },
              ]}
            />
            <CreateVendorSheet assignees={assignees} />
          </div>
        </Suspense>
      </div>
    );
  }

  return (
    <div className="m-auto max-w-[1200px]">
      <Suspense fallback={<div>Loading...</div>}>
        <SecondaryMenu
          items={[
            {
              path: `/${orgId}/vendors`,
              label: 'Overview',
            },
            {
              path: `/${orgId}/vendors/register`,
              label: 'Vendors',
            },
          ]}
        />

        <div>{children}</div>
      </Suspense>
    </div>
  );
}

const getAssignees = cache(async () => {
  const {
    session: { activeOrganizationId },
  } = await getServersideSession({
    headers: await headers(),
  });

  if (!activeOrganizationId) {
    return [];
  }

  const assignees = await db.member.findMany({
    where: {
      organizationId: activeOrganizationId,
      role: {
        notIn: ['employee', 'contractor'],
      },
      deactivated: false,
    },
    include: {
      user: true,
    },
  });

  return assignees;
});

const getVendorOverview = cache(async () => {
  const {
    session: { activeOrganizationId },
  } = await getServersideSession({
    headers: await headers(),
  });

  const orgId = activeOrganizationId;

  if (!orgId) {
    return { vendors: 0 };
  }

  return await db.$transaction(async (tx) => {
    const [vendors] = await Promise.all([
      tx.vendor.count({
        where: { organizationId: orgId },
      }),
    ]);

    return {
      vendors,
    };
  });
});
