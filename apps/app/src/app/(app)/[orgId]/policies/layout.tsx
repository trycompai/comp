import { requireRoutePermission } from '@/lib/permissions.server';

interface LayoutProps {
  children: React.ReactNode;
  params: Promise<{ orgId: string }>;
}

export default async function Layout({ children, params }: LayoutProps) {
  const { orgId } = await params;
  await requireRoutePermission('policies', orgId);
  return <>{children}</>;
}
