import { Header } from '@/components/header';
import { OrganizationSwitcher } from '@/components/organization-switcher';
import { auth } from '@/utils/auth';
import { db } from '@db';
import { headers } from 'next/headers';
import Link from 'next/link';
import { redirect } from 'next/navigation';

export default async function NoAccess() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session || !session.session.activeOrganizationId) {
    return redirect('/');
  }

  const organizations = await db.organization.findMany({
    where: {
      members: {
        some: {
          userId: session.user.id,
        },
      },
    },
  });

  const currentOrg = await db.organization.findUnique({
    where: {
      id: session.session.activeOrganizationId,
    },
  });

  return (
    <div className="flex h-dvh flex-col">
      <Header organizationId={currentOrg?.id} hideChat={true} />
      <div className="bg-foreground/05 flex flex-1 flex-col items-center justify-center gap-4">
        <h1 className="text-2xl font-bold">Access Denied</h1>
        <div className="flex flex-col text-center">
          <p>
            <b>Employees</b> and <b>Contractors</b> don&apos;t have access to app.trycomp.ai, did you mean to go to{' '}
            <Link href="https://portal.trycomp.ai" className="text-primary underline">
              portal.trycomp.ai
            </Link>
            ?
          </p>
          <p>Please select another organization or contact your organization administrator.</p>
        </div>
        <div>
          <OrganizationSwitcher organizations={organizations} organization={currentOrg} />
        </div>
      </div>
    </div>
  );
}
