import PageLayout from '@/app/components/PageLayout';
import { serverApi } from '@/app/lib/api-server';
import { isAuthorized } from '@/app/lib/utils';
import { Badge } from '@trycompai/ui/badge';
import { notFound, redirect } from 'next/navigation';
import { FrameworkTabs } from './FrameworkTabs';

interface FrameworkSummary {
  id: string;
  name: string;
  version: string;
  description: string;
  visible: boolean;
}

export default async function FrameworkLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ frameworkId: string }>;
}) {
  const isAllowed = await isAuthorized();
  if (!isAllowed) redirect('/auth');

  const { frameworkId } = await params;

  let framework: FrameworkSummary;
  try {
    framework = await serverApi<FrameworkSummary>(`/framework/${frameworkId}`);
  } catch {
    notFound();
  }

  return (
    <PageLayout
      breadcrumbs={[
        { label: 'Frameworks', href: '/frameworks' },
        { label: framework.name, href: `/frameworks/${frameworkId}` },
      ]}
    >
      <div className="mb-4 flex items-center gap-3">
        <h1 className="text-2xl font-bold">{framework.name}</h1>
        <Badge variant="outline">v{framework.version}</Badge>
        <Badge variant={framework.visible ? 'default' : 'secondary'}>
          {framework.visible ? 'Visible' : 'Hidden'}
        </Badge>
      </div>
      {framework.description && (
        <p className="text-muted-foreground mb-4 text-sm">{framework.description}</p>
      )}
      <FrameworkTabs />
      <div className="mt-4 flex min-h-0 flex-1 flex-col">{children}</div>
    </PageLayout>
  );
}
