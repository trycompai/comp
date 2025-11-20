"use client";

import type { AnyRealtimeRun } from "@trigger.dev/sdk";
import { useMemo, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Info,
  Loader2,
  RefreshCw,
  X,
} from "lucide-react";

import { Button } from "@trycompai/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@trycompai/ui/select";

import { FindingsTable } from "./FindingsTable";

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
  run: AnyRealtimeRun | undefined;
}

const severityOrder = { critical: 0, high: 1, medium: 2, low: 3, info: 4 };

export function ResultsView({
  findings,
  onRunScan,
  isScanning,
  run,
}: ResultsViewProps) {
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [selectedSeverity, setSelectedSeverity] = useState<string>("all");

  const isCompleted = run?.status === "COMPLETED";
  const isFailed =
    run?.status === "FAILED" ||
    run?.status === "CRASHED" ||
    run?.status === "SYSTEM_FAILURE" ||
    run?.status === "TIMED_OUT" ||
    run?.status === "CANCELED";

  const runOutput =
    run?.output && typeof run.output === "object" && "success" in run.output
      ? (run.output as {
          success: boolean;
          errors?: string[];
          failedIntegrations?: Array<{ name: string; error: string }>;
        })
      : null;

  const hasOutputErrors = runOutput && !runOutput.success;
  const outputErrorMessages = hasOutputErrors
    ? (runOutput.errors ??
      runOutput.failedIntegrations?.map((i) => `${i.name}: ${i.error}`) ??
      [])
    : [];

  const uniqueStatuses = Array.from(
    new Set(findings.map((f) => f.status).filter(Boolean) as string[]),
  );
  const uniqueSeverities = Array.from(
    new Set(findings.map((f) => f.severity).filter(Boolean) as string[]),
  );

  const filteredFindings = findings.filter((finding) => {
    const matchesStatus =
      selectedStatus === "all" || finding.status === selectedStatus;
    const matchesSeverity =
      selectedSeverity === "all" || finding.severity === selectedSeverity;
    return matchesStatus && matchesSeverity;
  });

  const sortedFindings = useMemo(
    () =>
      [...filteredFindings].sort((a, b) => {
        const severityA = a.severity
          ? (severityOrder[
              a.severity.toLowerCase() as keyof typeof severityOrder
            ] ?? 999)
          : 999;
        const severityB = b.severity
          ? (severityOrder[
              b.severity.toLowerCase() as keyof typeof severityOrder
            ] ?? 999)
          : 999;
        return severityA - severityB;
      }),
    [filteredFindings],
  );

  return (
    <div className="flex flex-col gap-6">
      {isScanning && (
        <div className="bg-primary/10 border-primary/20 flex items-center gap-3 rounded-lg border p-4">
          <Loader2 className="text-primary h-5 w-5 flex-shrink-0 animate-spin" />
          <div className="flex-1">
            <p className="text-primary text-sm font-medium">
              Scanning in progress...
            </p>
            <p className="text-muted-foreground text-xs">
              Checking your cloud infrastructure for security issues
            </p>
          </div>
        </div>
      )}

      {isCompleted && !isScanning && !hasOutputErrors && (
        <div className="bg-primary/10 border-primary/20 flex items-center gap-3 rounded-lg border p-4">
          <CheckCircle2 className="text-primary h-5 w-5 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-primary text-sm font-medium">Scan completed</p>
            <p className="text-muted-foreground text-xs">
              Results updated successfully
            </p>
          </div>
        </div>
      )}

      {hasOutputErrors && !isScanning && (
        <div className="bg-destructive/10 border-destructive/20 flex items-start gap-3 rounded-lg border p-4">
          <AlertTriangle className="text-destructive h-5 w-5 flex-shrink-0" />
          <div className="flex-1 space-y-1">
            <p className="text-destructive text-sm font-medium">
              Scan completed with errors
            </p>
            <ul className="text-muted-foreground text-xs leading-relaxed">
              {outputErrorMessages.slice(0, 5).map((message, index) => (
                <li key={index}>• {message}</li>
              ))}
              {outputErrorMessages.length === 0 && (
                <li>
                  Encountered an unknown error while processing integration
                  results.
                </li>
              )}
            </ul>
          </div>
        </div>
      )}

      {isFailed && !isScanning && (
        <div className="bg-destructive/10 border-destructive/20 flex items-center gap-3 rounded-lg border p-4">
          <X className="text-destructive h-5 w-5 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-destructive text-sm font-medium">Scan failed</p>
            <p className="text-muted-foreground text-xs">
              {typeof run?.error === "object" &&
              run.error &&
              "message" in run.error
                ? String(run.error.message)
                : "An error occurred during the scan. Please try again."}
            </p>
          </div>
        </div>
      )}

      {isCompleted &&
        findings.length === 0 &&
        !isScanning &&
        !hasOutputErrors && (
          <div className="flex items-center gap-3 rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-900 dark:bg-blue-950/20">
            <Info className="h-5 w-5 flex-shrink-0 text-blue-600 dark:text-blue-400" />
            <div className="flex-1">
              <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                Initial scan complete
              </p>
              <p className="text-muted-foreground text-xs">
                Security findings may take 24-48 hours to appear after enabling
                cloud security services. Check back later.
              </p>
            </div>
          </div>
        )}

      <div className="flex items-center justify-between">
        {findings.length > 0 ? (
          <div className="flex flex-wrap items-center gap-2">
            <Select
              value={selectedSeverity}
              onValueChange={setSelectedSeverity}
            >
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

            {(selectedSeverity !== "all" || selectedStatus !== "all") && (
              <p className="text-muted-foreground ml-2 text-sm">
                {sortedFindings.length} of {findings.length} findings
              </p>
            )}
          </div>
        ) : (
          <div />
        )}

        <Button
          onClick={onRunScan}
          disabled={isScanning}
          className="gap-2 rounded-lg"
        >
          <RefreshCw className="h-4 w-4" />
          Run Scan
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
