'use client';

import { Card, CardContent } from '@comp/ui/card';
import { Spinner } from '@trycompai/design-system';
import { Document } from '@trycompai/design-system/icons';
import { useAction } from 'next-safe-action/hooks';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { getPolicyPdfUrl } from '../../../actions/getPolicyPdfUrl';

interface PortalPdfViewerProps {
  policyId: string;
  s3Key?: string | null;
  versionId?: string;
}

export function PortalPdfViewer({ policyId, s3Key, versionId }: PortalPdfViewerProps) {
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const { execute: getUrl } = useAction(getPolicyPdfUrl, {
    onSuccess: (result) => {
      const url = result?.data?.data ?? null;
      if (result?.data?.success && url) {
        setSignedUrl(url);
      } else {
        setSignedUrl(null);
        toast.error('Could not load the policy document.');
      }
    },
    onError: () => toast.error('An error occurred while loading the policy.'),
    onSettled: () => setIsLoading(false),
  });

  useEffect(() => {
    if (s3Key) {
      getUrl({ policyId, versionId });
    } else {
      setIsLoading(false);
    }
  }, [s3Key, policyId, versionId, getUrl]);

  if (isLoading) {
    return (
      <div className="flex h-[500px] w-full items-center justify-center rounded-md border">
        <Spinner />
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
        <Document size={48} className="mx-auto text-muted-foreground" />
        <p className="mt-4 font-semibold">PDF Document Not Available</p>
        <p className="text-sm text-muted-foreground">
          This policy is stored as a PDF, but it could not be loaded.
        </p>
      </CardContent>
    </Card>
  );
}
