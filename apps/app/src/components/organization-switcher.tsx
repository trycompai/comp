'use client';

import { authClient } from '@/utils/auth-client';
import type { Organization } from '@db';
import { OrganizationSelector } from '@trycompai/design-system';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

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
  logoUrls = {},
  modal = true,
}: OrganizationSwitcherProps) {
  const router = useRouter();

  const [isSwitching, setIsSwitching] = useState(false);

  const handleOrgChange = async (orgId: string) => {
    if (orgId !== organization?.id) {
      setIsSwitching(true);
      try {
        await authClient.organization.setActive({ organizationId: orgId });
        router.push(`/${orgId}/`);
      } catch {
        setIsSwitching(false);
      }
    }
  };

  const handleCreateOrganization = () => {
    router.push('/setup?intent=create-additional');
  };

  // Transform organizations to DS OrganizationSelector format
  // logoUrls is fetched server-side and passed as prop
  const selectorOrgs = organizations.map((org) => ({
    id: org.id,
    name: org.name,
    color: getOrgColor(org.name),
    logoUrl: logoUrls[org.id],
    createdAt: org.createdAt,
  }));

  const isExecuting = isSwitching;

  return (
    <OrganizationSelector
      organizations={selectorOrgs}
      value={organization?.id}
      onValueChange={handleOrgChange}
      createLabel="Create organization"
      onCreate={handleCreateOrganization}
      loading={isExecuting}
      modal={modal}
      placeholder="Select organization"
      hotkey="o"
    />
  );
}