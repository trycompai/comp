'use client';

import { CreatePolicySheet } from '@/components/sheets/create-policy-sheet';
import { usePermissions } from '@/hooks/use-permissions';
import { Add, Download, Upload } from '@trycompai/design-system/icons';
import type { Policy } from '@db';
import { Button, HStack } from '@trycompai/design-system';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { BulkUploadPoliciesSheet } from './BulkUploadPoliciesSheet';
import { PolicyDownloadSheet } from './PolicyDownloadSheet';

interface PolicyPageActionsProps {
  policies: Policy[];
}

export function PolicyPageActions({ policies }: PolicyPageActionsProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isDownloadSheetOpen, setIsDownloadSheetOpen] = useState(false);
  const [isBulkUploadOpen, setIsBulkUploadOpen] = useState(false);
  const { hasPermission } = usePermissions();

  // Bulk upload creates a draft policy AND attaches a PDF, so it needs both
  // policy:create (create step) and policy:update (attach step). Gating on
  // create alone lets create-only users spawn empty draft policies whose PDF
  // attach then 403s, leaving orphan drafts.
  const canBulkUpload =
    hasPermission('policy', 'create') && hasPermission('policy', 'update');

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
        {canBulkUpload && (
          <Button
            variant="outline"
            iconLeft={<Upload />}
            onClick={() => setIsBulkUploadOpen(true)}
          >
            Bulk upload
          </Button>
        )}
        {hasPermission('policy', 'create') && (
          <Button iconLeft={<Add />} onClick={handleCreatePolicy}>
            Create Policy
          </Button>
        )}
      </HStack>
      <CreatePolicySheet />
      <BulkUploadPoliciesSheet
        open={isBulkUploadOpen}
        onOpenChange={setIsBulkUploadOpen}
      />
      <PolicyDownloadSheet
        open={isDownloadSheetOpen}
        onOpenChange={setIsDownloadSheetOpen}
        policies={policies}
      />
    </>
  );
}
