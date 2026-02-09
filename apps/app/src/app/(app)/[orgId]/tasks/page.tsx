import { auth } from '@/utils/auth';
import { db, Role } from '@db';
import { Metadata } from 'next';
import { cookies, headers } from 'next/headers';
import { TasksPageClient } from './components/TasksPageClient';

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: 'Evidence',
  };
}

// Force dynamic rendering to ensure searchParams are always fresh
export const dynamic = 'force-dynamic';

// Use cached versions of data fetching functions
export default async function TasksPage({
  searchParams,
  params,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
  params: Promise<{ orgId: string }>;
}) {
  // Extract specific params to pass down
  const { orgId } = await params;

  const tasks = await getTasks();
  const members = await getMembersWithMetadata();
  const controls = await getControls();
  const frameworkInstances = await getFrameworkInstances();
  const { hasEvidenceExportAccess, organizationName, evidenceApprovalEnabled } =
    await getEvidenceExportContext(orgId);

  // Read tab preference from cookie (server-side, no hydration issues)
  const cookieStore = await cookies();
  const savedView = cookieStore.get(`task-view-preference-${orgId}`)?.value;
  const activeTab = savedView === 'categories' || savedView === 'list' ? savedView : 'categories';

  return (
    <TasksPageClient
      tasks={tasks}
      members={members}
      controls={controls}
      frameworkInstances={frameworkInstances}
      activeTab={activeTab}
      orgId={orgId}
      organizationName={organizationName}
      hasEvidenceExportAccess={hasEvidenceExportAccess}
      evidenceApprovalEnabled={evidenceApprovalEnabled}
    />
  );
}

// Helper to safely parse comma-separated roles string
function parseRolesString(rolesStr: string | null | undefined): Role[] {
  if (!rolesStr) return [];
  return rolesStr
    .split(',')
    .map((r) => r.trim())
    .filter((r) => r in Role) as Role[];
}

const getEvidenceExportContext = async (organizationId: string) => {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    return {
      hasEvidenceExportAccess: false,
      organizationName: null,
      evidenceApprovalEnabled: false,
    };
  }

  const [member, organization] = await Promise.all([
    db.member.findFirst({
      where: {
        userId: session.user.id,
        organizationId,
        deactivated: false,
      },
      select: { role: true },
    }),
    db.organization.findUnique({
      where: { id: organizationId },
      select: { name: true, evidenceApprovalEnabled: true },
    }),
  ]);

  const roles = parseRolesString(member?.role);
  const hasEvidenceExportAccess =
    roles.includes(Role.auditor) || roles.includes(Role.admin) || roles.includes(Role.owner);

  return {
    hasEvidenceExportAccess,
    organizationName: organization?.name ?? null,
    evidenceApprovalEnabled: organization?.evidenceApprovalEnabled ?? false,
  };
};

const getTasks = async () => {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  const orgId = session?.session.activeOrganizationId;

  if (!orgId) {
    return [];
  }

  const tasks = await db.task.findMany({
    where: {
      organizationId: orgId,
    },
    include: {
      controls: {
        select: {
          id: true,
          name: true,
        },
      },
      evidenceAutomations: {
        select: {
          id: true,
          isEnabled: true,
          name: true,
          runs: {
            orderBy: {
              createdAt: 'desc',
            },
            take: 3,
            select: {
              status: true,
              success: true,
              evaluationStatus: true,
              createdAt: true,
              triggeredBy: true,
              runDuration: true,
            },
          },
        },
      },
    },
    orderBy: [{ status: 'asc' }, { title: 'asc' }],
  });
  return tasks;
};

const getMembersWithMetadata = async () => {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  const orgId = session?.session.activeOrganizationId;

  if (!orgId) {
    return [];
  }

  const members = await db.member.findMany({
    where: {
      organizationId: orgId,
      role: {
        notIn: [Role.employee, Role.auditor, Role.contractor],
      },
      deactivated: false,
    },
    include: {
      user: true,
    },
  });

  return members;
};

const getControls = async () => {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  const orgId = session?.session.activeOrganizationId;

  if (!orgId) {
    return [];
  }

  const controls = await db.control.findMany({
    where: {
      organizationId: orgId,
    },
    select: {
      id: true,
      name: true,
    },
    orderBy: {
      name: 'asc',
    },
  });

  return controls;
};

const getFrameworkInstances = async () => {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  const orgId = session?.session.activeOrganizationId;

  if (!orgId) {
    return [];
  }

  const frameworkInstances = await db.frameworkInstance.findMany({
    where: {
      organizationId: orgId,
    },
    include: {
      framework: {
        select: {
          id: true,
          name: true,
        },
      },
      requirementsMapped: {
        select: {
          controlId: true,
        },
      },
    },
  });

  return frameworkInstances;
};
