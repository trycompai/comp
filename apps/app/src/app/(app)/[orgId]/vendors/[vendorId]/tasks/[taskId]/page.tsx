import { serverApi } from '@/lib/api-server';
import { notFound } from 'next/navigation';
import SecondaryFields from './components/secondary-fields/secondary-fields';
import Title from './components/title/title';

interface PageProps {
  params: Promise<{
    orgId: string;
    taskId: string;
  }>;
}

interface PeopleApiResponse {
  data: Array<{
    id: string;
    role: string;
    deactivated: boolean;
    user: {
      id: string;
      name: string | null;
      email: string;
      image: string | null;
    };
  }>;
}

export default async function TaskPage({ params }: PageProps) {
  const { orgId, taskId } = await params;

  // GET /v1/tasks/:id returns task fields flat (no data wrapper)
  // GET /v1/people returns { data: people[], count }
  const [taskResult, peopleResult] = await Promise.all([
    serverApi.get<Record<string, unknown>>(`/v1/tasks/${taskId}`),
    serverApi.get<PeopleApiResponse>('/v1/people'),
  ]);

  const task = taskResult.data;

  if (!task) {
    notFound();
  }

  // Transform people to assignees (filter out employee/contractor, filter deactivated)
  const people = peopleResult.data?.data ?? [];
  const assignees = people
    .filter((p) => !p.deactivated && !['employee', 'contractor'].includes(p.role))
    .map((p) => ({
      id: p.id,
      role: p.role,
      user: p.user,
      organizationId: orgId,
      deactivated: false,
    }));

  return (
    <div className="space-y-8">
      <Title task={task as any} assignees={assignees as any} />
      <SecondaryFields task={task as any} assignees={assignees as any} />
    </div>
  );
}
