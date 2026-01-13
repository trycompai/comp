'use client';

import { changeOrganizationAction } from '@/actions/change-organization';
import type { Organization } from '@db';
import { OrganizationSelector } from '@trycompai/design-system';
import { useAction } from 'next-safe-action/hooks';
import { useRouter } from 'next/navigation';

interface OrganizationSwitcherProps {
  organizations: Organization[];
  organization: Organization | null;
  isCollapsed?: boolean;
  logoUrls?: Record<string, string>;
  modal?: boolean;
}

const DOT_COLORS = [
  '#0ea5e9', // sky-500
  '#3b82f6', // blue-500
  '#6366f1', // indigo-500
  '#a855f7', // purple-500
  '#d946ef', // fuchsia-500
  '#ec4899', // pink-500
  '#f43f5e', // rose-500
  '#ef4444', // red-500
  '#f97316', // orange-500
  '#f59e0b', // amber-500
  '#eab308', // yellow-500
  '#84cc16', // lime-500
  '#22c55e', // green-500
  '#10b981', // emerald-500
  '#14b8a6', // teal-500
  '#06b6d4', // cyan-500
];

function getOrgColor(name: string | null | undefined): string {
  if (!name) return DOT_COLORS[0];
  const charCodeSum = Array.from(name).reduce((sum, char) => sum + char.charCodeAt(0), 0);
  return DOT_COLORS[charCodeSum % DOT_COLORS.length] || DOT_COLORS[0];
}

export function OrganizationSwitcher({
  organizations,
  organization,
  modal = true,
}: OrganizationSwitcherProps) {
  const router = useRouter();

  const { execute, status } = useAction(changeOrganizationAction, {
    onSuccess: (result) => {
      const orgId = result.data?.data?.id;
      if (orgId) {
        router.push(`/${orgId}/`);
      }
    },
  });

  const handleOrgChange = (orgId: string) => {
    if (orgId !== organization?.id) {
      execute({ organizationId: orgId });
    }
  };

  // Transform organizations to DS OrganizationSelector format
  const selectorOrgs = organizations.map((org) => ({
    id: org.id,
    name: org.name,
    color: getOrgColor(org.name),
  }));

  const isExecuting = status === 'executing';

  return (
    <OrganizationSelector
      organizations={selectorOrgs}
      value={organization?.id}
      onValueChange={handleOrgChange}
      loading={isExecuting}
      modal={modal}
      placeholder="Select organization"
      hotkey="o"
    />
  );
}
