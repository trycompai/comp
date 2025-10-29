'use client';

import { Button } from '@comp/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@comp/ui/select';
import { useRealtimeRun } from '@trigger.dev/react-hooks';
import { CheckCircle2, Info, Loader2, RefreshCw, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { FindingsTable } from './FindingsTable';

interface Finding {
  id: string;
  title: string | null;
  description: string | null;
  remediation: string | null;
  status: string | null;
  severity: string | null;
  completedAt: Date | null;
}

interface ResultsViewProps {
  findings: Finding[];
  scanTaskId: string | null;
  scanAccessToken: string | null;
  onRunScan: () => Promise<string | null>;
  isScanning: boolean;
}

const severityOrder = { critical: 0, high: 1, medium: 2, low: 3, info: 4 };

// Helper function to extract clean error messages from cloud provider errors
function extractCleanErrorMessage(errorMessage: string): string {
  try {
    // Try to parse as JSON (GCP returns JSON blob)
    const parsed = JSON.parse(errorMessage);

    // GCP error structure: { error: { message: "actual message" } }
    if (parsed.error?.message) {
      return parsed.error.message;
    }
  } catch {
    // Not JSON, return original
  }

  return errorMessage;
}

export function ResultsView({
  findings,
  scanTaskId,
  scanAccessToken,
  onRunScan,
  isScanning,
}: ResultsViewProps) {
  // Track scan status with Trigger.dev hooks
  const { run } = useRealtimeRun(scanTaskId || '', {
    enabled: !!scanTaskId && !!scanAccessToken,
    accessToken: scanAccessToken || undefined,
  });

  const scanCompleted = run?.status === 'COMPLETED';
  const scanFailed =
    run?.status === 'FAILED' || run?.status === 'CRASHED' || run?.status === 'SYSTEM_FAILURE';
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedSeverity, setSelectedSeverity] = useState<string>('all');
  const [showSuccessBanner, setShowSuccessBanner] = useState(false);
  const [showErrorBanner, setShowErrorBanner] = useState(false);

  // Show success banner when scan completes, auto-hide after 5 seconds
  useEffect(() => {
    if (scanCompleted) {
      setShowSuccessBanner(true);
      const timer = setTimeout(() => {
        setShowSuccessBanner(false);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [scanCompleted]);

  // Auto-dismiss error banner after 30 seconds
  useEffect(() => {
    if (scanFailed) {
      setShowErrorBanner(true);
      const timer = setTimeout(() => {
        setShowErrorBanner(false);
      }, 30000);
      return () => clearTimeout(timer);
    }
  }, [scanFailed]);

  // Get unique statuses and severities
  const uniqueStatuses = Array.from(
    new Set(findings.map((f) => f.status).filter(Boolean) as string[]),
  );
  const uniqueSeverities = Array.from(
    new Set(findings.map((f) => f.severity).filter(Boolean) as string[]),
  );

  // Filter findings
  const filteredFindings = findings.filter((finding) => {
    const matchesStatus = selectedStatus === 'all' || finding.status === selectedStatus;
    const matchesSeverity = selectedSeverity === 'all' || finding.severity === selectedSeverity;
    return matchesStatus && matchesSeverity;
  });

  // Sort findings by severity (always)
  const sortedFindings = [...filteredFindings].sort((a, b) => {
    const severityA = a.severity
      ? (severityOrder[a.severity.toLowerCase() as keyof typeof severityOrder] ?? 999)
      : 999;
    const severityB = b.severity
      ? (severityOrder[b.severity.toLowerCase() as keyof typeof severityOrder] ?? 999)
      : 999;
    return severityA - severityB;
  });

  return (
    <div className="flex flex-col gap-6">
      {/* Scan Status Banner */}
      {isScanning && (
        <div className="bg-primary/10 flex items-center gap-3 rounded-lg border border-primary/20 p-4">
          <Loader2 className="text-primary h-5 w-5 animate-spin flex-shrink-0" />
          <div className="flex-1">
            <p className="text-primary text-sm font-medium">Scanning in progress...</p>
            <p className="text-muted-foreground text-xs">
              Checking your cloud infrastructure for security issues
            </p>
          </div>
        </div>
      )}

      {showSuccessBanner && scanCompleted && !isScanning && (
        <div className="bg-primary/10 flex items-center gap-3 rounded-lg border border-primary/20 p-4">
          <CheckCircle2 className="text-primary h-5 w-5 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-primary text-sm font-medium">Scan completed</p>
            <p className="text-muted-foreground text-xs">Results updated successfully</p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowSuccessBanner(false)}
            className="text-muted-foreground hover:text-foreground h-auto p-1"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Propagation delay info banner - only when scan succeeds but returns empty output */}
      {scanCompleted && findings.length === 0 && !isScanning && !scanFailed && (
        <div className="bg-blue-50 dark:bg-blue-950/20 flex items-center gap-3 rounded-lg border border-blue-200 dark:border-blue-900 p-4">
          <Info className="text-blue-600 dark:text-blue-400 h-5 w-5 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-blue-900 dark:text-blue-100 text-sm font-medium">Initial scan complete</p>
            <p className="text-muted-foreground text-xs">
              Security findings may take 12-24 hours to appear after enabling cloud security services. Check back later or run another scan.
            </p>
          </div>
        </div>
      )}

      {showErrorBanner && scanFailed && !isScanning && (
        <div className="bg-destructive/10 flex items-center gap-3 rounded-lg border border-destructive/20 p-4">
          <X className="text-destructive h-5 w-5 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-destructive text-sm font-medium">Scan failed</p>
            <p className="text-muted-foreground text-xs">
              {extractCleanErrorMessage(run?.error?.message || 'An error occurred during the scan. Please try again.')}
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowErrorBanner(false)}
            className="text-muted-foreground hover:text-foreground h-auto p-1"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Filters and Run Scan Button */}
      <div className="flex items-center justify-between">
        {findings.length > 0 ? (
          <div className="flex flex-wrap items-center gap-2">
            <Select value={selectedSeverity} onValueChange={setSelectedSeverity}>
              <SelectTrigger className="h-9 w-[160px] rounded-lg border-dashed">
                <SelectValue placeholder="All Severities" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Severities</SelectItem>
                {uniqueSeverities.map((severity) => (
                  <SelectItem key={severity} value={severity}>
                    {severity}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={selectedStatus} onValueChange={setSelectedStatus}>
              <SelectTrigger className="h-9 w-[160px] rounded-lg border-dashed">
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                {uniqueStatuses.map((status) => (
                  <SelectItem key={status} value={status}>
                    {status}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {(selectedSeverity !== 'all' || selectedStatus !== 'all') && (
              <p className="text-muted-foreground ml-2 text-sm">
                {sortedFindings.length} of {findings.length} findings
              </p>
            )}
          </div>
        ) : (
          <div />
        )}

        <Button onClick={onRunScan} disabled={isScanning} className="gap-2 rounded-lg">
          <RefreshCw className="h-4 w-4" />
          Run Scan
        </Button>
      </div>

      {/* Results Table */}
      {sortedFindings.length > 0 ? (
        <FindingsTable findings={sortedFindings} />
      ) : findings.length > 0 ? (
        <div className="text-muted-foreground rounded-xs border p-12 text-center">
          <p className="text-lg">No findings match the selected filters</p>
          <p className="mt-2 text-sm">Try adjusting your filters</p>
        </div>
      ) : (
        <div className="rounded-lg border-2 border-dashed p-12 text-center">
          <p className="text-muted-foreground text-lg">No findings yet</p>
          <p className="text-muted-foreground mt-2 text-sm">
            Click "Run Scan" above to check for security issues
          </p>
        </div>
      )}
    </div>
  );
}
