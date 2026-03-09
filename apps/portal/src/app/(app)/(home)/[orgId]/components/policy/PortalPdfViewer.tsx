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
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

interface PortalPdfViewerProps {
  policyId: string;
  s3Key?: string | null;
  versionId?: string;
}

export function PortalPdfViewer({ policyId, s3Key, versionId }: PortalPdfViewerProps) {
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!s3Key) {
      setIsLoading(false);
      return;
    }

    let cancelled = false;

    const fetchPdfUrl = async () => {
      try {
        const params = new URLSearchParams({ policyId });
        if (versionId) {
          params.set('versionId', versionId);
        }
        const res = await fetch(`/api/portal/policy-pdf-url?${params}`, {
          credentials: 'include',
        });
        if (!res.ok) {
          throw new Error('Failed to fetch PDF URL');
        }
        const data = await res.json();
        if (!cancelled) {
          if (data.success && data.url) {
            setSignedUrl(data.url);
          } else {
            setSignedUrl(null);
            toast.error('Could not load the policy document.');
          }
        }
      } catch {
        if (!cancelled) {
          toast.error('An error occurred while loading the policy.');
          setSignedUrl(null);
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    fetchPdfUrl();

    return () => {
      cancelled = true;
    };
  }, [s3Key, policyId, versionId]);

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
