'use client';

import { generatePolicyPDF } from '@/lib/pdf-generator';
import { Button } from '@comp/ui/button';
import { useSWRConfig } from 'swr';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@comp/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@comp/ui/dropdown-menu';
import { Icons } from '@comp/ui/icons';
import type { Member, Policy, PolicyVersion, User } from '@db';
import type { JSONContent } from '@tiptap/react';
import { useRealtimeRun } from '@trigger.dev/react-hooks';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { auditLogsKey } from '../hooks/useAuditLogs';
import { usePolicy, policyKey } from '../hooks/usePolicy';
import { policyVersionsKey } from '../hooks/usePolicyVersions';
import { usePermissions } from '@/hooks/use-permissions';

type PolicyWithVersion = Policy & {
  approver: (Member & { user: User }) | null;
  currentVersion?: PolicyVersion | null;
};

export function PolicyHeaderActions({
  policy,
  organizationId,
}: {
  policy: PolicyWithVersion | null;
  organizationId: string;
}) {
  const router = useRouter();
  const { mutate: globalMutate } = useSWRConfig();
  const [isRegenerateConfirmOpen, setRegenerateConfirmOpen] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);

  const { regeneratePolicy, getPdfUrl } = usePolicy({
    policyId: policy?.id ?? '',
    organizationId,
  });

  // Real-time task tracking
  const [runInfo, setRunInfo] = useState<{
    runId: string;
    accessToken: string;
  } | null>(null);
  const toastIdRef = useRef<string | number | null>(null);

  // Subscribe to run status when we have a runId
  const { run } = useRealtimeRun(runInfo?.runId ?? '', {
    accessToken: runInfo?.accessToken ?? '',
    enabled: !!runInfo?.runId && !!runInfo?.accessToken,
  });

  const revalidateAll = () => {
    if (!policy) return;
    globalMutate(policyKey(policy.id, organizationId));
    globalMutate(policyVersionsKey(policy.id, organizationId));
    globalMutate(auditLogsKey(policy.id, organizationId));
  };

  // Handle run completion
  useEffect(() => {
    if (!run) return;

    if (run.status === 'COMPLETED') {
      if (toastIdRef.current) {
        toast.dismiss(toastIdRef.current);
      }
      toast.success('Policy content updated!');
      setIsRegenerating(false);
      setRunInfo(null);
      toastIdRef.current = null;
      revalidateAll();
    } else if (run.status === 'FAILED' || run.status === 'CRASHED' || run.status === 'CANCELED') {
      if (toastIdRef.current) {
        toast.dismiss(toastIdRef.current);
      }
      toast.error('Policy regeneration failed');
      setIsRegenerating(false);
      setRunInfo(null);
      toastIdRef.current = null;
    }
  }, [run]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleRegenerate = async () => {
    if (!policy) return;
    setIsRegenerating(true);
    setRegenerateConfirmOpen(false);

    try {
      const response = await regeneratePolicy();

      const { runId, publicAccessToken } = response.data?.data ?? {};
      if (runId && publicAccessToken) {
        const toastId = toast.loading('Regenerating policy content...');
        toastIdRef.current = toastId;

        setRunInfo({ runId, accessToken: publicAccessToken });
      }
    } catch {
      toast.error('Failed to trigger policy regeneration');
      setIsRegenerating(false);
    }
  };

  const updateQueryParam = ({ key, value }: { key: string; value: string }) => {
    const url = new URL(window.location.href);
    url.searchParams.set(key, value);
    router.push(`${url.pathname}?${url.searchParams.toString()}`);
  };

  const handleDownloadPDF = async () => {
    if (!policy) {
      toast.error('Policy not available');
      return;
    }

    setIsDownloading(true);

    try {
      // Always call the API to check for an uploaded PDF (also creates audit log)
      const url = await getPdfUrl(policy.currentVersion?.id);

      if (url) {
        // Download the uploaded PDF directly
        const link = document.createElement('a');
        link.href = url;
        link.download = `${policy.name || 'Policy'}.pdf`;
        link.target = '_blank';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        return;
      }

      // Fall back to generating PDF from content
      const contentSource = policy.currentVersion?.content ?? policy.content;

      if (!contentSource) {
        toast.error('Policy content not available for download');
        return;
      }

      // Convert content to JSONContent array
      let policyContent: JSONContent[];
      if (Array.isArray(contentSource)) {
        policyContent = contentSource as JSONContent[];
      } else if (typeof contentSource === 'object' && contentSource !== null) {
        policyContent = [contentSource as JSONContent];
      } else {
        toast.error('Invalid policy content format');
        return;
      }

      // Generate and download the PDF
      generatePolicyPDF(policyContent, [], policy.name || 'Policy Document');
    } catch (error) {
      console.error('Error downloading policy PDF:', error);
      toast.error('Failed to generate policy PDF');
    } finally {
      setIsDownloading(false);
      // Revalidate audit logs so the activity tab reflects the download
      globalMutate(auditLogsKey(policy.id, organizationId));
    }
  };

  const { hasPermission } = usePermissions();
  const canUpdate = hasPermission('policy', 'update');
  const canDelete = hasPermission('policy', 'delete');

  if (!policy) return null;

  const isPendingApproval = !!policy.approverId;

  // Hide entire menu if user has no write permissions
  if (!canUpdate && !canDelete) return null;

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button size="icon" variant="ghost" className="m-0 size-auto p-2">
            <Icons.Settings className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {canUpdate && (
            <DropdownMenuItem
              onClick={() => setRegenerateConfirmOpen(true)}
              disabled={isPendingApproval || isRegenerating}
            >
              <Icons.AI className="mr-2 h-4 w-4" />{' '}
              {isRegenerating ? 'Regenerating...' : 'Regenerate policy'}
            </DropdownMenuItem>
          )}
          {canUpdate && (
            <DropdownMenuItem
              onClick={() => {
                updateQueryParam({ key: 'policy-overview-sheet', value: 'true' });
              }}
            >
              <Icons.Edit className="mr-2 h-4 w-4" /> Edit policy
            </DropdownMenuItem>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => handleDownloadPDF()} disabled={isDownloading}>
            <Icons.Download className="mr-2 h-4 w-4" />{' '}
            {isDownloading ? 'Downloading...' : 'Download as PDF'}
          </DropdownMenuItem>
          {canUpdate && (
            <DropdownMenuItem
              onClick={() => {
                updateQueryParam({ key: 'archive-policy-sheet', value: 'true' });
              }}
            >
              <Icons.InboxCustomize className="mr-2 h-4 w-4" /> Archive / Restore
            </DropdownMenuItem>
          )}
          {canDelete && (
            <DropdownMenuItem
              onClick={() => {
                updateQueryParam({ key: 'delete-policy', value: 'true' });
              }}
              className="text-destructive"
            >
              <Icons.Delete className="mr-2 h-4 w-4" /> Delete
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Regenerate Confirmation Dialog */}
      <Dialog open={isRegenerateConfirmOpen} onOpenChange={setRegenerateConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Regenerate Policy</DialogTitle>
            <DialogDescription>
              This will generate new policy content using your org context and frameworks. It will
              delete all existing versions and their PDFs for this policy. This cannot be undone.
              Continue?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRegenerateConfirmOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleRegenerate}
              disabled={isRegenerating}
            >
              {isRegenerating ? 'Working…' : 'Confirm'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
