import { redirect } from 'next/navigation';

export default async function AdminPage({
  params,
}: {
  params: Promise<{ orgId: string }>;
}) {
  const { orgId } = await params;
  redirect(`/${orgId}/admin/organizations`);
}
