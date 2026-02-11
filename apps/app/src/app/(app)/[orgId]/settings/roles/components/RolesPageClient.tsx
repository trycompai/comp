'use client';

import { Section, Stack } from '@trycompai/design-system';
import { useRoles } from '../hooks/useRoles';
import Loading from '../loading';
import type { CustomRole } from './RolesTable';
import { RolesTable } from './RolesTable';
import { SystemRolesTable } from './SystemRoles';

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

  return (
    <Stack gap="xl">
      <Section
        title="System Roles"
        description="Built-in roles with predefined permissions. These cannot be modified."
      >
        <SystemRolesTable />
      </Section>

      <Section
        title="Custom Roles"
        description="Create custom roles with specific permissions tailored to your organization."
      >
        <RolesTable roles={roles} />
      </Section>
    </Stack>
  );
}
