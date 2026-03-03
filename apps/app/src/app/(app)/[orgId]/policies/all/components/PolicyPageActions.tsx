'use client';

import { BulkUploadPoliciesSheet } from '@/components/sheets/bulk-upload-policies-sheet';
import { CreatePolicySheet } from '@/components/sheets/create-policy-sheet';
import { usePolicyActions } from '@/hooks/use-policies';
import { Add, Download, Upload } from '@carbon/icons-react';
import type { Policy } from '@db';
import { Button, HStack } from '@trycompai/design-system';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';

interface PolicyPageActionsProps {
  policies: Policy[];
}

export function PolicyPageActions({ policies }: PolicyPageActionsProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isDownloadingAll, setIsDownloadingAll] = useState(false);
  const { downloadAll } = usePolicyActions();

  const handleDownloadAll = async () => {
    setIsDownloadingAll(true);
    try {
      const result = await downloadAll();
      window.open(result.downloadUrl, '_blank');
    } catch {
      toast.error('Failed to generate PDF bundle');
    } finally {
      setIsDownloadingAll(false);
    }
  };

  const handleCreatePolicy = () => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('create-policy-sheet', 'true');
    router.push(`${pathname}?${params.toString()}`);
  };

  const handleBulkUpload = () => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('bulk-upload-policies', 'true');
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
        <Button variant="outline" iconLeft={<Upload />} onClick={handleBulkUpload}>
          Upload Policies
        </Button>
        <Button iconLeft={<Add />} onClick={handleCreatePolicy}>
          Create Policy
        </Button>
      </HStack>
      <CreatePolicySheet />
      <BulkUploadPoliciesSheet />
    </>
  );
}
