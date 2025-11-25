import { auth } from '@/utils/auth';
import { db, Role } from '@db';
import { headers } from 'next/headers';
import { notFound, redirect } from 'next/navigation';
import { AuditorView } from './components/AuditorView';

// Helper to safely parse comma-separated roles string
function parseRolesString(rolesStr: string | null | undefined): Role[] {
  if (!rolesStr) return [];
  return rolesStr
    .split(',')
    .map((r) => r.trim())
    .filter((r) => r in Role) as Role[];
}

export async function generateMetadata() {
  return {
    title: 'Auditor View',
  };
}

export default async function AuditorPage({ params }: { params: Promise<{ orgId: string }> }) {
  const { orgId: organizationId } = await params;

  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    redirect('/auth');
  }

  const member = await db.member.findFirst({
    where: {
      userId: session.user.id,
      organizationId,
      deactivated: false,
    },
  });

  if (!member) {
    redirect('/auth/unauthorized');
  }

  const roles = parseRolesString(member.role);
  if (!roles.includes(Role.auditor)) {
    notFound();
  }

  return (
    <div className="container py-6">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight">Auditor View</h1>
        <p className="text-muted-foreground">
          Welcome to the auditor view. This area is restricted to authorized personnel.
        </p>
      </div>

      <AuditorView orgId={organizationId} />
    </div>
  );
}
