import { FindingsPage } from './FindingsPage';

export function generateMetadata() {
  return { title: 'Findings' };
}

export default async function Page({
  params,
}: {
  params: Promise<{ orgId: string }>;
}) {
  const { orgId } = await params;
  return <FindingsPage orgId={orgId} />;
}
