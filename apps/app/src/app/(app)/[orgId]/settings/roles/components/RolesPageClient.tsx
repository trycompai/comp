'use client';

import { useRoles } from '../hooks/useRoles';
import Loading from '../loading';
import type { CustomRole } from './RolesTable';
import { RolesTable } from './RolesTable';

interface RolesPageClientProps {
  initialData: CustomRole[];
}

export function RolesPageClient({ initialData }: RolesPageClientProps) {
  const { roles, isLoading } = useRoles({
    initialData,
  });

  if (isLoading) {
    return <Loading />;
  }

  return <RolesTable roles={roles} />;
}
