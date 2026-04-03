'use client';

import { CreatePolicySheet } from '@/components/sheets/create-policy-sheet';
import { api } from '@/lib/api-client';
import { Add, Download } from '@carbon/icons-react';
import type { Policy } from '@db';
import { Button, HStack } from '@trycompai/design-system';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';
import { usePermissions } from '@/hooks/use-permissions';

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
      const res = await api.get<{ downloadUrl: string; name: string; policyCount: number }>(
        '/v1/policies/download-all',
      );

      if (res.error || !res.data?.downloadUrl) {
        toast.error('Failed to generate PDF. Please try again.');
        return;
      }

      const link = document.createElement('a');
      link.href = res.data.downloadUrl;
      link.download = `${res.data.name ?? 'all-policies'}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch {
      toast.error('Failed to download policies.');
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
