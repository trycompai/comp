'use client';

import { useApi } from '@/hooks/use-api';
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
  const api = useApi();
  const router = useRouter();
  const { mutate: globalMutate } = useSWRConfig();
  const [isRegenerateConfirmOpen, setRegenerateConfirmOpen] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);

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
      router.refresh();
    } else if (run.status === 'FAILED' || run.status === 'CRASHED' || run.status === 'CANCELED') {
      if (toastIdRef.current) {
        toast.dismiss(toastIdRef.current);
      }
      toast.error('Policy regeneration failed');
      setIsRegenerating(false);
      setRunInfo(null);
      toastIdRef.current = null;
    }
  }, [run, router]);

  const handleRegenerate = async () => {
    if (!policy) return;
    setIsRegenerating(true);
    setRegenerateConfirmOpen(false);

    try {
      const response = await api.post<{ data: { runId: string; publicAccessToken: string } }>(
        `/v1/policies/${policy.id}/regenerate`,
      );

      if (response.error) throw new Error(response.error);

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
      const params = new URLSearchParams();
      if (policy.currentVersion?.id) params.set('versionId', policy.currentVersion.id);
      const qs = params.toString();
      const result = await api.get<{ url: string | null }>(
        `/v1/policies/${policy.id}/pdf/signed-url${qs ? `?${qs}` : ''}`,
      );

      if (result.data?.url) {
        // Download the uploaded PDF directly
        const link = document.createElement('a');
        link.href = result.data.url;
        link.download = `${policy.name || 'Policy'}.pdf`;
        link.target = '_blank';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        return;
      }

      // Fall back to generating PDF from content
      // Use published version content if available, otherwise policy content
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
      generatePolicyPDF(policyContent as any, [], policy.name || 'Policy Document');
    } catch (error) {
      console.error('Error downloading policy PDF:', error);
      toast.error('Failed to generate policy PDF');
    } finally {
      setIsDownloading(false);
      // Revalidate audit logs so the activity tab reflects the download
      globalMutate(auditLogsKey(policy.id, organizationId));
    }
  };

  if (!policy) return null;

  const isPendingApproval = !!policy.approverId;

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button size="icon" variant="ghost" className="m-0 size-auto p-2">
            <Icons.Settings className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem
            onClick={() => setRegenerateConfirmOpen(true)}
            disabled={isPendingApproval || isRegenerating}
          >
            <Icons.AI className="mr-2 h-4 w-4" />{' '}
            {isRegenerating ? 'Regenerating...' : 'Regenerate policy'}
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => {
              updateQueryParam({ key: 'policy-overview-sheet', value: 'true' });
            }}
          >
            <Icons.Edit className="mr-2 h-4 w-4" /> Edit policy
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => handleDownloadPDF()} disabled={isDownloading}>
            <Icons.Download className="mr-2 h-4 w-4" />{' '}
            {isDownloading ? 'Downloading...' : 'Download as PDF'}
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => {
              updateQueryParam({ key: 'archive-policy-sheet', value: 'true' });
            }}
          >
            <Icons.InboxCustomize className="mr-2 h-4 w-4" /> Archive / Restore
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => {
              updateQueryParam({ key: 'delete-policy', value: 'true' });
            }}
            className="text-destructive"
          >
            <Icons.Delete className="mr-2 h-4 w-4" /> Delete
          </DropdownMenuItem>
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
