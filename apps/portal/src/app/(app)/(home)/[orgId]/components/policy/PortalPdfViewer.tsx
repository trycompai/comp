'use client';

import { useApiSWR } from '@/hooks/use-api-swr';
import { Card, CardContent } from '@comp/ui/card';
import { FileText, Loader2 } from 'lucide-react';
import { useParams } from 'next/navigation';
import { toast } from 'sonner';

interface PortalPdfViewerProps {
  policyId: string;
  s3Key?: string | null;
}

export function PortalPdfViewer({ policyId, s3Key }: PortalPdfViewerProps) {
  const { orgId } = useParams<{ orgId: string }>();
  const { data, isLoading } = useApiSWR<{ success: boolean; data?: string; error?: string }>(
    s3Key ? `/v1/policies/${policyId}/pdf-url` : null,
    {
      organizationId: orgId,
      onSuccess: (res) => {
        if (res.data && !res.data.success) {
          toast.error(res.data.error || 'Could not load the policy document.');
        }
      },
    },
  );

  const signedUrl = data?.data?.success ? (data.data.data ?? null) : null;

  if (isLoading) {
    return (
      <div className="flex h-[500px] w-full items-center justify-center rounded-md border">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (signedUrl) {
    return (
      <iframe
        key={signedUrl}
        src={signedUrl}
        className="h-[500px] w-full rounded-md border"
        title="Policy Document"
      />
    );
  }

  // Fallback UI if there's no PDF or an error occurs
  return (
    <Card className="flex h-[500px] w-full flex-col items-center justify-center">
      <CardContent className="text-center">
        <FileText className="mx-auto h-12 w-12 text-muted-foreground" />
        <p className="mt-4 font-semibold">PDF Document Not Available</p>
        <p className="text-sm text-muted-foreground">
          This policy is stored as a PDF, but it could not be loaded.
        </p>
      </CardContent>
    </Card>
  );
}
