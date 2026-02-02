'use client';

import { useParams } from 'next/navigation';
import { useRoles } from '../hooks/useRoles';
import Loading from '../loading';
import type { CustomRole } from './RolesTable';
import { RolesTable } from './RolesTable';

interface RolesPageClientProps {
  initialData: CustomRole[];
}

export function RolesPageClient({ initialData }: RolesPageClientProps) {
  const params = useParams();
  const orgId = params.orgId as string;

  const { roles, isLoading } = useRoles({
    organizationId: orgId,
    initialData,
  });

  if (isLoading) {
    return <Loading />;
  }

  return <RolesTable roles={roles} />;
}
