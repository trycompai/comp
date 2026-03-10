import { serverApi } from '@/lib/api-server';
import { PageHeader, PageLayout, Stack } from '@trycompai/design-system';
import { Metadata } from 'next';
import { SearchParams } from 'nuqs';
import { CreateControlSheet } from './components/CreateControlSheet';
import { ControlsTable } from './components/controls-table';
import type { ControlWithRelations } from './data/queries';
import { searchParamsCache } from './data/validations';

interface ControlTableProps {
  searchParams: Promise<SearchParams>;
  params: Promise<{ orgId: string }>;
}

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: 'Controls',
  };
}

export default async function ControlsPage({ ...props }: ControlTableProps) {
  const searchParams = await props.searchParams;
  const search = searchParamsCache.parse(searchParams);
  const sort = search.sort?.[0];

  const queryParams = new URLSearchParams({
    page: String(search.page),
    perPage: String(search.perPage),
    ...(search.name && { name: search.name }),
    ...(sort && { sortBy: sort.id, sortDesc: String(sort.desc) }),
  });

  const [controlsRes, optionsRes] = await Promise.all([
    serverApi.get<{ data: ControlWithRelations[]; pageCount: number }>(
      `/v1/controls?${queryParams}`,
    ),
    serverApi.get<{
      policies: { id: string; name: string }[];
      tasks: { id: string; title: string }[];
      requirements: {
        id: string;
        name: string;
        identifier: string;
        frameworkInstanceId: string;
        frameworkName: string;
      }[];
    }>('/v1/controls/options'),
  ]);

  const controlsData = controlsRes.data ?? { data: [], pageCount: 0 };
  const options = optionsRes.data ?? { policies: [], tasks: [], requirements: [] };

  const promises = Promise.resolve(
    [controlsData] as [{ data: ControlWithRelations[]; pageCount: number }],
  );

  return (
    <PageLayout>
      <Stack gap="md">
        <PageHeader
          title="Controls"
          actions={
            <CreateControlSheet
              policies={options.policies}
              tasks={options.tasks}
              requirements={options.requirements}
            />
          }
        />
        <ControlsTable promises={promises} />
      </Stack>
    </PageLayout>
  );
}
