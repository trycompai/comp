'use client';

import { Button } from '@comp/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@comp/ui/select';
import { AlertCircle, CheckCircle2, Loader2, RefreshCw, Settings } from 'lucide-react';
import { useMemo, useState } from 'react';
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
  onRunScan: () => Promise<string | null>;
  isScanning: boolean;
  needsConfiguration?: boolean;
  onConfigure?: () => void;
}

const severityOrder = { critical: 0, high: 1, medium: 2, low: 3, info: 4 };

export function ResultsView({
  findings,
  onRunScan,
  isScanning,
  needsConfiguration,
  onConfigure,
}: ResultsViewProps) {
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedSeverity, setSelectedSeverity] = useState<string>('all');
  const [scanCompleted, setScanCompleted] = useState(false);

  const uniqueStatuses = Array.from(
    new Set(findings.map((f) => f.status).filter(Boolean) as string[]),
  );
  const uniqueSeverities = Array.from(
    new Set(findings.map((f) => f.severity).filter(Boolean) as string[]),
  );

  const filteredFindings = findings.filter((finding) => {
    const matchesStatus = selectedStatus === 'all' || finding.status === selectedStatus;
    const matchesSeverity = selectedSeverity === 'all' || finding.severity === selectedSeverity;
    return matchesStatus && matchesSeverity;
  });

  const sortedFindings = useMemo(
    () =>
      [...filteredFindings].sort((a, b) => {
        const severityA = a.severity
          ? (severityOrder[a.severity.toLowerCase() as keyof typeof severityOrder] ?? 999)
          : 999;
        const severityB = b.severity
          ? (severityOrder[b.severity.toLowerCase() as keyof typeof severityOrder] ?? 999)
          : 999;
        return severityA - severityB;
      }),
    [filteredFindings],
  );

  const handleRunScan = async () => {
    setScanCompleted(false);
    const result = await onRunScan();
    if (result) {
      setScanCompleted(true);
      // Hide the success message after 5 seconds
      setTimeout(() => setScanCompleted(false), 5000);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      {needsConfiguration && onConfigure && (
        <div className="bg-warning/10 rounded-lg border border-warning/30 p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-warning shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-warning-foreground">Configuration Required</p>
              <p className="text-sm text-warning-foreground/80 mt-1">
                Please configure the required variables (like region or organization ID) to enable
                security scans.
              </p>
            </div>
          </div>
          <div className="mt-3 ml-8">
            <Button size="sm" variant="outline" onClick={onConfigure}>
              <Settings className="h-4 w-4 mr-2" />
              Configure
            </Button>
          </div>
        </div>
      )}

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

      {scanCompleted && !isScanning && (
        <div className="bg-primary/10 flex items-center gap-3 rounded-lg border border-primary/20 p-4">
          <CheckCircle2 className="text-primary h-5 w-5 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-primary text-sm font-medium">Scan completed</p>
            <p className="text-muted-foreground text-xs">Results updated successfully</p>
          </div>
        </div>
      )}

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

        <Button onClick={handleRunScan} disabled={isScanning} className="gap-2 rounded-lg">
          <RefreshCw className={`h-4 w-4 ${isScanning ? 'animate-spin' : ''}`} />
          {isScanning ? 'Scanning...' : 'Run Scan'}
        </Button>
      </div>

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
