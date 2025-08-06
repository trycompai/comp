import { getPostHogClient } from '@/app/posthog';
import { auth } from '@/utils/auth';
import { SecondaryMenu } from '@comp/ui/secondary-menu';
import { db } from '@db';
import { getGT } from 'gt-next/server';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';

export default async function Layout({ children }: { children: React.ReactNode }) {
  const t = await getGT();
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  const orgId = session?.session.activeOrganizationId;

  if (!orgId) {
    return redirect('/');
  }

  // Fetch all members first
  const allMembers = await db.member.findMany({
    where: {
      organizationId: orgId,
    },
  });

  const employees = allMembers.filter((member) => {
    const roles = member.role.includes(',') ? member.role.split(',') : [member.role];
    return roles.includes('employee');
  });

  const isFleetEnabled = await getPostHogClient()?.isFeatureEnabled(
    'is-fleet-enabled',
    session?.session.userId,
  );

  return (
    <div className="m-auto max-w-[1200px]">
      <SecondaryMenu
        items={[
          {
            path: `/${orgId}/people/all`,
            label: t('People'),
          },
          ...(employees.length > 0
            ? [
                {
                  path: `/${orgId}/people/dashboard`,
                  label: t('Employee Tasks'),
                },
              ]
            : []),
          ...(isFleetEnabled
            ? [
                {
                  path: `/${orgId}/people/devices`,
                  label: t('Employee Devices'),
                },
              ]
            : []),
        ]}
      />

      <main>{children}</main>
    </div>
  );
}
