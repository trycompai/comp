'use client';

import { api } from '@/lib/api-client';
import { Badge } from '@comp/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@comp/ui/card';
import { AlertCircle, ArrowLeft, ExternalLink, FileText, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Button } from '@trycompai/design-system';
import { toast } from 'sonner';
import { isReportInProgress, formatReportDate, statusLabel, statusVariant } from '../lib';
import {
  usePenetrationTest,
  usePenetrationTestProgress,
} from '../hooks/use-penetration-tests';

interface PenetrationTestPageClientProps {
  orgId: string;
  reportId: string;
}

const parseResponseError = async (response: Response): Promise<string> => {
  const payload = await response.text().catch(() => '');
  if (!payload) {
    return `Request failed with status ${response.status}`;
  }

  try {
    const parsed = JSON.parse(payload) as { error?: string; message?: string };
    return parsed.error || parsed.message || payload;
  } catch {
    return payload;
  }
};

const toSafeExternalHttpUrl = (value: string): string | null => {
  try {
    const parsed = new URL(value);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return null;
    }

    return parsed.toString();
  } catch {
    return null;
  }
};

export function PenetrationTestPageClient({ orgId, reportId }: PenetrationTestPageClientProps) {
  const router = useRouter();
  const { report, isLoading, error } = usePenetrationTest(orgId, reportId);
  const { progress } = usePenetrationTestProgress(orgId, reportId, report?.status);

  if (isLoading && !report) {
    return (
      <div className="flex min-h-[220px] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  if (error || !report) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-destructive" />
            Unable to load report
          </CardTitle>
          <CardDescription>
            {error instanceof Error ? error.message : 'No report found for this organization.'}
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const isInProgress = isReportInProgress(report.status);
  const safeTemporalUiUrl =
    report.temporalUiUrl ? toSafeExternalHttpUrl(report.temporalUiUrl) : null;
  const runFailureReason = report.failedReason ?? report.error ?? null;

  const openArtifact = async (path: string, filename?: string): Promise<void> => {
    try {
      const response = await api.raw(path, {
        method: 'GET',
        organizationId: orgId,
        headers: {
          Accept: filename ? 'application/pdf' : 'text/markdown',
        },
      });

      if (!response.ok) {
        throw new Error(await parseResponseError(response));
      }

      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);

      if (filename) {
        const link = document.createElement('a');
        link.href = objectUrl;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } else {
        window.open(objectUrl, '_blank', 'noopener,noreferrer');
      }

      window.setTimeout(() => {
        URL.revokeObjectURL(objectUrl);
      }, 60_000);
    } catch (artifactError) {
      toast.error(
        artifactError instanceof Error
          ? artifactError.message
          : 'Failed to open report artifact',
      );
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <Button
          variant="outline"
          onClick={() => router.push(`/${orgId}/security/penetration-tests`)}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to reports
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Report summary</CardTitle>
          <CardDescription>
            Track run status, view links, and access artifacts when complete.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <p className="text-muted-foreground">Status</p>
              <Badge variant={statusVariant[report.status]}>{statusLabel[report.status]}</Badge>
            </div>
            <div>
              <p className="text-muted-foreground">Created</p>
              <p>{formatReportDate(report.createdAt)}</p>
            </div>
            <div className="md:col-span-2">
              <p className="text-muted-foreground">Target URL</p>
              <p className="break-all text-xs">{report.targetUrl}</p>
            </div>
            <div className="md:col-span-2">
              <p className="text-muted-foreground">Repository</p>
              <p className="break-all text-xs">{report.repoUrl || '—'}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Last update</p>
              <p>{formatReportDate(report.updatedAt)}</p>
            </div>
          </div>

          {runFailureReason && (
            <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
              <p className="font-medium">Run error</p>
              <p>{runFailureReason}</p>
            </div>
          )}

          {isInProgress && progress ? (
            <div className="rounded-md border p-3 text-sm">
              <p className="font-medium">Current progress</p>
              <p className="text-muted-foreground">
                {`In progress${typeof progress.completedAgents === 'number' && typeof progress.totalAgents === 'number' ? ` (${progress.completedAgents}/${progress.totalAgents})` : ''}`}
              </p>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Deliverables</CardTitle>
          <CardDescription>Open report outputs after completion.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          <Button
            variant="outline"
            onClick={() =>
              void openArtifact(
                `/v1/security-penetration-tests/${encodeURIComponent(report.id)}/report`,
              )
            }
          >
            <FileText className="mr-2 h-4 w-4" />
            View markdown
          </Button>
          {report.status === 'completed' ? (
            <Button
              variant="outline"
              onClick={() =>
                void openArtifact(
                  `/v1/security-penetration-tests/${encodeURIComponent(report.id)}/pdf`,
                  `penetration-test-${report.id}.pdf`,
                )
              }
            >
              <ExternalLink className="mr-2 h-4 w-4" />
              Download PDF
            </Button>
          ) : null}
          {safeTemporalUiUrl ? (
            <Button
              variant="outline"
              onClick={() => {
                window.open(safeTemporalUiUrl, '_blank', 'noopener,noreferrer');
              }}
            >
              <ExternalLink className="mr-2 h-4 w-4" />
              Open temporal UI
            </Button>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
