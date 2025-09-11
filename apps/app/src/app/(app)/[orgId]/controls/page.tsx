import PageWithBreadcrumb from '@/components/pages/PageWithBreadcrumb';
import { getValidFilters } from '@/lib/data-table';
import { auth } from '@/utils/auth';
import { db } from '@db';
import { Metadata } from 'next';
import { headers } from 'next/headers';
import { SearchParams } from 'nuqs';
import { ControlsTable } from './components/controls-table';
import { getControls } from './data/queries';
import { searchParamsCache } from './data/validations';

interface ControlTableProps {
  searchParams: Promise<SearchParams>;
}

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: 'Controls',
  };
}

export default async function ControlsPage({ ...props }: ControlTableProps) {
  const searchParams = await props.searchParams;
  const search = searchParamsCache.parse(searchParams);
  const validFilters = getValidFilters(search.filters);

  const promises = Promise.all([
    getControls({
      ...search,
      filters: validFilters,
    }),
  ]);

  const policies = await getPolicies();
  const tasks = await getTasks();
  const requirements = await getRequirements();

  return (
    <PageWithBreadcrumb breadcrumbs={[{ label: 'Controls', current: true }]}>
      <ControlsTable
        promises={promises}
        policies={policies}
        tasks={tasks}
        requirements={requirements}
      />
    </PageWithBreadcrumb>
  );
}

const getPolicies = async () => {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  const orgId = session?.session.activeOrganizationId;

  if (!orgId) {
    return [];
  }

  const policies = await db.policy.findMany({
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

  return policies;
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
    select: {
      id: true,
      title: true,
    },
    orderBy: {
      title: 'asc',
    },
  });

  return tasks;
};

const getRequirements = async () => {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  const orgId = session?.session.activeOrganizationId;

  if (!orgId) {
    return [];
  }

  // Get all framework instances for this organization
  const frameworkInstances = await db.frameworkInstance.findMany({
    where: {
      organizationId: orgId,
    },
    include: {
      framework: {
        include: {
          requirements: {
            select: {
              id: true,
              name: true,
              identifier: true,
            },
          },
        },
      },
    },
  });

  // Flatten requirements and include framework context
  const requirements = frameworkInstances.flatMap((fi) =>
    fi.framework.requirements.map((req) => ({
      id: req.id,
      name: req.name,
      identifier: req.identifier,
      frameworkInstanceId: fi.id,
      frameworkName: fi.framework.name,
    })),
  );

  return requirements;
};
