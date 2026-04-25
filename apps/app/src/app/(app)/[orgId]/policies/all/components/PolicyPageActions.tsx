'use client';

import { CreatePolicySheet } from '@/components/sheets/create-policy-sheet';
import { usePermissions } from '@/hooks/use-permissions';
import { Add, Download } from '@trycompai/design-system/icons';
import type { Policy } from '@db';
import { Button, HStack } from '@trycompai/design-system';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { PolicyDownloadSheet } from './PolicyDownloadSheet';

interface PolicyPageActionsProps {
  policies: Policy[];
}

export function PolicyPageActions({ policies }: PolicyPageActionsProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isDownloadSheetOpen, setIsDownloadSheetOpen] = useState(false);
  const { hasPermission } = usePermissions();

  const handleOpenDownloadSheet = () => setIsDownloadSheetOpen(true);

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
            onClick={handleOpenDownloadSheet}
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
      <PolicyDownloadSheet
        open={isDownloadSheetOpen}
        onOpenChange={setIsDownloadSheetOpen}
        policies={policies}
      />
    </>
  );
}
