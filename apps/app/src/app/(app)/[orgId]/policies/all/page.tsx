import { redirect } from 'next/navigation';

interface PolicyTableProps {
  params: Promise<{ orgId: string }>;
}

export default async function PoliciesAllPage({ params }: PolicyTableProps) {
  const { orgId } = await params;
  redirect(`/${orgId}/policies`);
}
