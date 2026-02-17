'use client';

import {
  Card,
  CardContent,
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  Text,
} from '@trycompai/design-system';
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
      <div className="flex min-h-[320px] w-full items-center justify-center rounded-md border border-border md:min-h-[420px]">
        <Text variant="muted">Loading policy document...</Text>
      </div>
    );
  }

  if (signedUrl) {
    return (
      <iframe
        key={signedUrl}
        src={signedUrl}
        className="h-[60vh] min-h-[320px] w-full rounded-md border border-border md:min-h-[420px]"
        title="Policy Document"
      />
    );
  }

  // Fallback UI if there's no PDF or an error occurs
  return (
    <Card>
      <CardContent>
        <Empty>
          <EmptyMedia variant="icon">
            <Document size={24} />
          </EmptyMedia>
          <EmptyHeader>
            <EmptyTitle>PDF Document Not Available</EmptyTitle>
            <EmptyDescription>
              This policy is stored as a PDF, but it could not be loaded.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      </CardContent>
    </Card>
  );
}
