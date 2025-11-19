import PageWithBreadcrumb from '@/components/pages/PageWithBreadcrumb';
import { getValidFilters } from '@/lib/data-table';
import { db } from '@db';
import { Metadata } from 'next';
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

export default async function ControlsPage({
  params,
  ...props
}: ControlTableProps & { params: Promise<{ orgId: string }> }) {
  const { orgId } = await params;
  const searchParams = await props.searchParams;
  const search = searchParamsCache.parse(searchParams);
  const validFilters = getValidFilters(search.filters);

  const promises = Promise.all([
    getControls(orgId, {
      ...search,
      filters: validFilters,
    }),
  ]);

  const policies = await getPolicies(orgId);
  const tasks = await getTasks(orgId);
  const requirements = await getRequirements(orgId);

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

const getPolicies = async (orgId: string) => {
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

const getTasks = async (orgId: string) => {
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

const getRequirements = async (orgId: string) => {
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
