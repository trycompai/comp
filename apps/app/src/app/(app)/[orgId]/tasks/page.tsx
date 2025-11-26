import { auth } from '@/utils/auth';
import { db, Role } from '@db';
import { Metadata } from 'next';
import { cookies, headers } from 'next/headers';
import { TaskList } from './components/TaskList';

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: 'Tasks',
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

  // Read tab preference from cookie (server-side, no hydration issues)
  const cookieStore = await cookies();
  const savedView = cookieStore.get(`task-view-preference-${orgId}`)?.value;
  const activeTab = savedView === 'categories' || savedView === 'list' ? savedView : 'categories';

  return (
    <div className="mx-auto w-full max-w-[1400px] px-6 py-8">
      <TaskList tasks={tasks} members={members} controls={controls} activeTab={activeTab} />
    </div>
  );
}

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
