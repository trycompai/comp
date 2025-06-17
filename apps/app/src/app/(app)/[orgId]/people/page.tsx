import { redirect } from 'next/navigation';

export default async function Page({
  params,
}: {
  params: Promise<{ locale: string; orgId: string }>;
}) {
  const { orgId } = await params;
  return redirect(`/${orgId}/people/all`);
}
