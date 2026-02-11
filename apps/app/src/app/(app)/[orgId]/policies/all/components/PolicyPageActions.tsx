'use client';

import { CreatePolicySheet } from '@/components/sheets/create-policy-sheet';
import { api } from '@/lib/api-client';
import { downloadAllPolicies } from '@/lib/pdf-generator';
import { Add, Download } from '@carbon/icons-react';
import type { AuditLog, Member, Organization, Policy, User } from '@db';
import { Button, HStack } from '@trycompai/design-system';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { usePermissions } from '@/hooks/use-permissions';

type AuditLogWithRelations = AuditLog & {
  user: User | null;
  member: Member | null;
  organization: Organization;
};

interface PolicyPageActionsProps {
  policies: Policy[];
}

export function PolicyPageActions({ policies }: PolicyPageActionsProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isDownloadingAll, setIsDownloadingAll] = useState(false);
  const { hasPermission } = usePermissions();

  const handleDownloadAll = async () => {
    setIsDownloadingAll(true);
    try {
      const logsEntries = await Promise.all(
        policies.map(async (policy) => {
          const res = await api.get<{ data: AuditLogWithRelations[] }>(
            `/v1/policies/${policy.id}/activity`,
          );
          const logs = Array.isArray(res.data?.data) ? res.data.data : [];
          return [policy.id, logs] as const;
        }),
      );
      const policyLogs = Object.fromEntries(logsEntries);
      downloadAllPolicies(policies, policyLogs);
    } finally {
      setIsDownloadingAll(false);
    }
  };

  const handleCreatePolicy = () => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('create-policy-sheet', 'true');
    router.push(`${pathname}?${params.toString()}`);
  };

  return (
    <>
      <HStack gap="sm" align="center">
        {policies.length > 0 && (
          <Button
            variant="outline"
            iconLeft={<Download />}
            loading={isDownloadingAll}
            onClick={handleDownloadAll}
          >
            Download All
          </Button>
        )}
        {hasPermission('policy', 'create') && (
          <Button iconLeft={<Add />} onClick={handleCreatePolicy}>
            Create Policy
          </Button>
        )}
      </HStack>
      <CreatePolicySheet />
    </>
  );
}
