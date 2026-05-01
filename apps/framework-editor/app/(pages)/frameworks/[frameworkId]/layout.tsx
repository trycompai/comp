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

interface PublishedVersion {
  id: string;
  version: string;
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

  // Fetch the latest published version (our new FrameworkVersion table).
  // Fall back to the catalog version string if no versions have been published.
  let latestVersion: string = framework.version;
  try {
    const versionsRes = await serverApi<{ data: PublishedVersion[] }>(
      `/framework/${frameworkId}/versions`,
    );
    const latest = Array.isArray(versionsRes?.data) ? versionsRes.data[0] : undefined;
    if (latest?.version) latestVersion = latest.version;
  } catch {
    // ignore — endpoint may not exist or no versions yet
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
        <Badge variant="outline">v{latestVersion}</Badge>
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
