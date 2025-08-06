import { AppOnboarding } from '@/components/app-onboarding';
import { getServersideSession } from '@/lib/get-session';
import { SecondaryMenu } from '@comp/ui/secondary-menu';
import { db } from '@db';
import { getGT } from 'gt-next/server';
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
  const t = await getGT();

  if (overview?.vendors === 0) {
    return (
      <div className="m-auto max-w-[1200px]">
        <Suspense fallback={<div>{t('Loading...')}</div>}>
          <div className="mt-8">
            <AppOnboarding
              title={t('Vendor Management')}
              description={t("Manage your vendors and ensure your organization's supply chain is secure and compliant.")}
              cta={t('Add vendor')}
              imageSrcDark="/onboarding/vendor-management.webp"
              imageSrcLight="/onboarding/vendor-management-light.webp"
              imageAlt={t('Vendor Management')}
              sheetName="createVendorSheet"
              faqs={[
                {
                  questionKey: t('What is vendor management?'),
                  answerKey: t(
                    'Vendor management is the process of managing, and controlling relationships and agreements with third-party suppliers of goods and services.'
                  ),
                },
                {
                  questionKey: t('Why is vendor management important?'),
                  answerKey: t(
                    'It helps to ensure that you are getting the most value from your vendors, while also minimizing risks and maintaining compliance.'
                  ),
                },
                {
                  questionKey: t('What are the key steps in vendor management?'),
                  answerKey: t(
                    'The key steps include vendor selection, contract negotiation, performance monitoring, risk management, and relationship management.'
                  ),
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
      <Suspense fallback={<div>{t('Loading...')}</div>}>
        <SecondaryMenu
          items={[
            {
              path: `/${orgId}/vendors`,
              label: t('Overview'),
            },
            {
              path: `/${orgId}/vendors/register`,
              label: t('Vendors'),
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
        notIn: ['employee'],
      },
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
