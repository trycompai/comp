import { AppOnboarding } from '@/components/app-onboarding';
import { serverApi } from '@/lib/api-server';
import { SecondaryMenu } from '@comp/ui/secondary-menu';
import type { Member, User } from '@db';
import { Suspense } from 'react';
import { CreateVendorSheet } from '../components/create-vendor-sheet';

interface VendorsResponse {
  data: unknown[];
  count: number;
}

interface PeopleResponse {
  data: (Member & { user: User })[];
}

export default async function Layout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ orgId: string }>;
}) {
  const { orgId } = await params;

  const [vendorsRes, membersRes] = await Promise.all([
    serverApi.get<VendorsResponse>('/v1/vendors'),
    serverApi.get<PeopleResponse>('/v1/people'),
  ]);

  const vendorCount = vendorsRes.data?.count ?? 0;
  const allMembers = Array.isArray(membersRes.data?.data)
    ? membersRes.data.data
    : [];
  const assignees = allMembers.filter(
    (m) =>
      !m.deactivated &&
      !m.role.includes('employee') &&
      !m.role.includes('contractor'),
  );

  if (vendorCount === 0) {
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
            {orgId && <CreateVendorSheet assignees={assignees} organizationId={orgId} />}
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
            { path: `/${orgId}/vendors`, label: 'Overview' },
            { path: `/${orgId}/vendors/register`, label: 'Vendors' },
          ]}
        />
        <div>{children}</div>
      </Suspense>
    </div>
  );
}
