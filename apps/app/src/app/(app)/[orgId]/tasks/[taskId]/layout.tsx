import PageWithBreadcrumb from '@/components/pages/PageWithBreadcrumb';
import { db } from '@comp/db';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@comp/ui/breadcrumb';

export default async function Layout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ taskId: string; orgId: string }>;
}) {
  const { taskId, orgId } = await params;

  const task = await db.task.findUnique({
    where: {
      id: taskId,
    },
  });

  return (
    <PageWithBreadcrumb
      breadcrumbs={[
        { label: 'Tasks', href: `/${orgId}/tasks` },
        { label: task?.title ?? '', href: `/${orgId}/tasks/${taskId}` },
      ]}
    >
      {children}
    </PageWithBreadcrumb>
  );
}
