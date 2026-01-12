'use client';

import { CreatePolicySheet } from '@/components/sheets/create-policy-sheet';
import { downloadAllPolicies } from '@/lib/pdf-generator';
import { Add, Download } from '@carbon/icons-react';
import { Button } from '@trycompai/design-system';
import type { Policy } from '@db';
import { Loader2 } from 'lucide-react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { getLogsForPolicy } from '../../[policyId]/data';

interface PolicyPageActionsProps {
  policies: Policy[];
}

export function PolicyPageActions({ policies }: PolicyPageActionsProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isDownloadingAll, setIsDownloadingAll] = useState(false);

  const handleDownloadAll = async () => {
    setIsDownloadingAll(true);
    try {
      const logsEntries = await Promise.all(
        policies.map(async (policy) => {
          const logs = await getLogsForPolicy(policy.id);
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
      <div className="flex items-center gap-2">
        {policies.length > 0 && (
          <Button variant="outline" size="sm" onClick={handleDownloadAll} disabled={isDownloadingAll}>
            {isDownloadingAll ? (
              <span className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Downloading...
              </span>
            ) : (
              <>
                <Download className="h-4 w-4" />
                Download All
              </>
            )}
          </Button>
        )}
        <Button size="sm" onClick={handleCreatePolicy}>
          <Add className="h-4 w-4" />
          Create Policy
        </Button>
      </div>
      <CreatePolicySheet />
    </>
  );
}
