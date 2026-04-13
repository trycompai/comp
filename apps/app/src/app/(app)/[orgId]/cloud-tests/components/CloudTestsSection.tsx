'use client';

import { useApi } from '@/hooks/use-api';
import { Badge } from '@trycompai/ui/badge';
import { Button } from '@trycompai/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@trycompai/ui/dialog';
import {
  AlertTriangle,
  Check,
  ChevronDown,
  ChevronRight,
  Copy,
  ExternalLink,
  ListOrdered,
  Loader2,
  RefreshCw,
  Search,
  ShieldAlert,
  ShieldCheck,
  ShieldX,
  Terminal,
  Wrench,
  X,
  Zap,
} from 'lucide-react';
import { awsRemediationScript } from '@trycompai/integration-platform';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { getActiveBatch } from '../actions/batch-fix';
import { BatchRemediationDialog } from './BatchRemediationDialog';
import { AzureSetupGuide } from './AzureSetupGuide';
import { GcpSetupGuide } from './GcpSetupGuide';
import { RemediationDialog } from './RemediationDialog';
import { ScheduledScanPopover } from './ScheduledScanPopover';

interface Finding {
  id: string;
  title: string | null;
  description: string | null;
  remediation: string | null;
  status: string | null;
  severity: string | null;
  serviceId: string | null;
  findingKey: string | null;
  resourceId: string | null;
  completedAt: Date | null;
  connectionId: string;
  providerSlug: string;
  integration: { integrationId: string };
}

interface RemediationCapabilities {
  enabled: boolean;
  remediations: Array<{
    remediationKey: string;
    findingPattern: string;
    description: string;
    risk: string;
    guidedOnly?: boolean;
    guidedSteps?: string[];
    rollbackSupported?: boolean;
  }>;
}

interface CloudTestsSectionProps {
  providerSlug: string;
  connectionId: string;
  onScanComplete?: () => void;
  orgId: string;
  /** When the last scan completed — null means never scanned */
  lastRunAt?: Date | null;
  /** Connection variables (e.g., GCP org ID) */
  variables?: Record<string, unknown>;
}

const SEVERITY_ORDER: Record<string, number> = {
  critical: 0, high: 1, medium: 2, low: 3, info: 4,
};

const SEVERITY_STYLES: Record<string, { dot: string; badge: string }> = {
  critical: {
    dot: 'bg-red-500',
    badge: 'border-red-200 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-400',
  },
  high: {
    dot: 'bg-orange-500',
    badge: 'border-orange-200 bg-orange-50 text-orange-700 dark:border-orange-800 dark:bg-orange-950 dark:text-orange-400',
  },
  medium: {
    dot: 'bg-yellow-500',
    badge: 'border-yellow-200 bg-yellow-50 text-yellow-700 dark:border-yellow-800 dark:bg-yellow-950 dark:text-yellow-400',
  },
  low: {
    dot: 'bg-blue-500',
    badge: 'border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-400',
  },
  info: {
    dot: 'bg-gray-400',
    badge: 'border-gray-200 bg-gray-50 text-gray-600 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-400',
  },
};

const SERVICE_NAMES: Record<string, string> = {
  'security-hub': 'Security Hub',
  'iam-analyzer': 'IAM Access Analyzer',
  'cloudtrail': 'CloudTrail',
  's3': 'S3 Bucket Security',
  'ec2-vpc': 'EC2 & VPC Security',
  'rds': 'RDS Security',
  'kms': 'KMS',
  'cloudwatch': 'CloudWatch',
  'config': 'AWS Config',
  'guardduty': 'GuardDuty',
  'secrets-manager': 'Secrets Manager',
  'waf': 'WAF',
  'elb': 'ELB / ALB',
  'acm': 'ACM',
  'backup': 'AWS Backup',
  'inspector': 'Inspector',
  'ecs-eks': 'ECS & EKS',
  'lambda': 'Lambda',
  'dynamodb': 'DynamoDB',
  'sns-sqs': 'SNS & SQS',
  'ecr': 'ECR',
  'opensearch': 'OpenSearch',
  'redshift': 'Redshift',
  'macie': 'Macie',
  'route53': 'Route 53',
  'api-gateway': 'API Gateway',
  'cloudfront': 'CloudFront',
  'cognito': 'Cognito',
  'elasticache': 'ElastiCache',
  'efs': 'EFS',
  'msk': 'MSK',
  'sagemaker': 'SageMaker',
  'systems-manager': 'Systems Manager',
  'codebuild': 'CodeBuild',
  'network-firewall': 'Network Firewall',
  'shield': 'Shield',
  'kinesis': 'Kinesis',
  'glue': 'Glue',
  'athena': 'Athena',
  'emr': 'EMR',
  'step-functions': 'Step Functions',
  'eventbridge': 'EventBridge',
  'transfer-family': 'Transfer Family',
  'elastic-beanstalk': 'Elastic Beanstalk',
  'appflow': 'AppFlow',
};

interface ServiceGroup {
  serviceId: string;
  name: string;
  findings: Finding[];
  passed: number;
  failed: number;
}

export function CloudTestsSection({
  providerSlug,
  connectionId,
  onScanComplete,
  orgId,
  lastRunAt,
  variables,
}: CloudTestsSectionProps) {
  const api = useApi();
  const [scanCompleted, setScanCompleted] = useState(false);
  const [scanError, setScanError] = useState<{ message: string; errorCode?: string } | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [batchServiceId, setBatchServiceId] = useState<string | null>(null);
  const [activeBatch, setActiveBatch] = useState<{
    batchId: string;
    triggerRunId: string;
    accessToken: string;
    findings: Array<{ id: string; title: string; status: string; error?: string }>;
  } | null>(null);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [severityFilter, setSeverityFilter] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [capabilities, setCapabilities] =
    useState<RemediationCapabilities | null>(null);
  const [capabilitiesLoaded, setCapabilitiesLoaded] = useState(false);
  const [remediationTarget, setRemediationTarget] = useState<{
    connectionId: string;
    checkResultId: string;
    remediationKey: string;
    findingTitle: string;
    guidedOnly?: boolean;
    guidedSteps?: string[];
    risk?: string;
    description?: string;
  } | null>(null);
  const [showSetupDialog, setShowSetupDialog] = useState(false);

  const findingsResponse = api.useSWR<{ data: Finding[]; count: number }>(
    '/v1/cloud-security/findings',
    { revalidateOnFocus: true },
  );

  const allFindings = Array.isArray(findingsResponse.data?.data?.data)
    ? findingsResponse.data.data.data
    : [];

  // Load remediation capabilities for the selected connection
  useEffect(() => {
    if (!connectionId || (providerSlug !== 'aws' && providerSlug !== 'gcp' && providerSlug !== 'azure')) return;

    const loadCapabilities = async () => {
      const resp = await api.get(
        `/v1/cloud-security/remediation/capabilities?connectionId=${connectionId}`,
      );
      if (!resp.error && resp.data) {
        setCapabilities(resp.data as RemediationCapabilities);
      }
      setCapabilitiesLoaded(true);
    };
    loadCapabilities();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connectionId, providerSlug]);

  // Check for active batch once on mount (separate from capabilities to avoid re-runs)
  useEffect(() => {
    if (!connectionId || (providerSlug !== 'aws' && providerSlug !== 'gcp' && providerSlug !== 'azure')) return;
    let cancelled = false;

    getActiveBatch(connectionId).then((batch) => {
      if (cancelled) return;
      if (batch) {
        setActiveBatch(batch);
        setBatchServiceId('_active');
      }
    });

    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connectionId]);

  const canFixFinding = useCallback(
    (finding: Finding): { key: string; enabled: boolean } | null => {
      if (!capabilities?.enabled || !finding.findingKey) return null;
      // AI-powered: every finding with a findingKey can be analyzed
      return { key: finding.findingKey, enabled: true };
    },
    [capabilities],
  );

  const findings = useMemo(() => {
    return allFindings
      .filter(
        (f) =>
          f.providerSlug === providerSlug || f.connectionId === connectionId,
      )
      .sort(
        (a, b) =>
          (SEVERITY_ORDER[a.severity ?? 'info'] ?? 5) -
          (SEVERITY_ORDER[b.severity ?? 'info'] ?? 5),
      );
  }, [allFindings, providerSlug, connectionId]);

  const failedFindings = findings.filter(
    (f) => f.status === 'failed' || f.status === 'FAILED',
  );
  const passedFindings = findings.filter(
    (f) => f.status === 'passed' || f.status === 'success',
  );

  // Group findings by serviceId
  const serviceGroups = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    const groupMap = new Map<string, Finding[]>();
    for (const f of findings) {
      const key = f.serviceId ?? 'other';
      const group = groupMap.get(key) ?? [];
      group.push(f);
      groupMap.set(key, group);
    }

    const groups: ServiceGroup[] = [];
    for (const [serviceId, groupFindings] of groupMap) {
      const serviceName = SERVICE_NAMES[serviceId] ?? serviceId;
      const serviceMatches = q ? serviceName.toLowerCase().includes(q) : true;

      const failed = groupFindings.filter(
        (f) => f.status === 'failed' || f.status === 'FAILED',
      );
      const passed = groupFindings.filter(
        (f) => f.status === 'passed' || f.status === 'success',
      );

      let filteredFailed = severityFilter
        ? failed.filter((f) => f.severity?.toLowerCase() === severityFilter)
        : failed;

      // If search query exists and service name doesn't match, filter findings by title
      if (q && !serviceMatches) {
        filteredFailed = filteredFailed.filter(
          (f) =>
            f.title?.toLowerCase().includes(q) ||
            f.description?.toLowerCase().includes(q) ||
            f.findingKey?.toLowerCase().includes(q),
        );
      }

      groups.push({
        serviceId,
        name: serviceName,
        findings: filteredFailed,
        passed: passed.length,
        failed: failed.length,
      });
    }

    return groups
      .filter((g) => g.findings.length > 0 || (!severityFilter && !q && g.passed > 0))
      .sort((a, b) => b.failed - a.failed || a.name.localeCompare(b.name));
  }, [findings, severityFilter, searchQuery]);

  // Split into baseline (security fundamentals) vs service-specific
  const BASELINE_SERVICE_IDS = new Set(['cloudtrail', 'config', 'guardduty', 'iam', 'cloudwatch', 'kms']);
  const baselineGroups = serviceGroups.filter((g) => BASELINE_SERVICE_IDS.has(g.serviceId));
  const regularGroups = serviceGroups.filter((g) => !BASELINE_SERVICE_IDS.has(g.serviceId));

  const severityCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const f of failedFindings) {
      const sev = f.severity?.toLowerCase() ?? 'info';
      counts[sev] = (counts[sev] ?? 0) + 1;
    }
    return counts;
  }, [failedFindings]);

  const handleRunScan = useCallback(async () => {
    if (!connectionId) return;
    setIsScanning(true);
    const startTime = Date.now();
    toast.message('Starting security scan...');
    setScanError(null);
    try {
      const response = await api.post<{
        success?: boolean;
        message?: string;
        errorCode?: string;
      }>(
        `/v1/cloud-security/scan/${connectionId}`,
        {},
      );
      if (response.error) {
        const data = response.data as { message?: string; errorCode?: string } | undefined;
        const errorCode = data?.errorCode;
        const message = data?.message ?? (typeof response.error === 'string' ? response.error : 'Scan failed');
        // GCP setup errors get persistent inline message
        if (errorCode === 'SCC_NOT_ACTIVATED' || errorCode === 'GCP_ORG_MISSING') {
          setScanError({ message, errorCode });
        } else {
          toast.error(message);
        }
        return;
      }
      await findingsResponse.mutate();
      onScanComplete?.();
      setScanCompleted(true);
      const elapsed = Math.round((Date.now() - startTime) / 1000);
      toast.success(`Scan completed in ${elapsed}s!`);
    } catch (err) {
      toast.error(
        `Scan failed: ${err instanceof Error ? err.message : 'Unknown error'}`,
      );
    } finally {
      setIsScanning(false);
    }
  }, [connectionId, api, findingsResponse, onScanComplete]);

  const toggleExpanded = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleGroup = (serviceId: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(serviceId)) next.delete(serviceId);
      else next.add(serviceId);
      return next;
    });
  };

  // Track if batch dialog is open so we can show the floating pill when minimized
  // Compute batch dialog data LIVE from current findings (never stale)
  const batchTarget = useMemo(() => {
    if (!batchServiceId) return null;
    const group = serviceGroups.find((g) => g.serviceId === batchServiceId);
    if (!group) return null;
    const fixable = group.findings.filter((f) => {
      const match = canFixFinding(f);
      return match?.key && match.enabled;
    });
    if (fixable.length === 0) return null;
    return {
      serviceName: group.name,
      findings: fixable.map((f) => ({
        id: f.id,
        title: f.title,
        key: f.findingKey!,
        severity: f.severity ?? 'medium',
      })),
    };
  }, [batchServiceId, serviceGroups, canFixFinding]);

  const batchDialogOpen = Boolean(batchServiceId);

  if (!connectionId) return null;

  return (
    <div className="space-y-5">
      {/* Active batch pill — shows when batch is running but dialog is minimized */}
      {activeBatch && !batchDialogOpen && (
        <button
          type="button"
          onClick={() => setBatchServiceId('_active')}
          className="flex w-full items-center gap-2.5 rounded-lg border border-primary/20 bg-primary/5 px-4 py-2.5 text-left transition-colors hover:bg-primary/10"
        >
          <Loader2 className="h-4 w-4 animate-spin text-primary shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-primary">Batch fix in progress</p>
            <p className="text-xs text-primary/70 truncate">
              Click to view progress
            </p>
          </div>
          <Zap className="h-4 w-4 text-primary/50 shrink-0" />
        </button>
      )}

      {/* Scanning banner */}
      {isScanning && (
        <div className="flex items-center gap-2.5 rounded-lg border border-primary/20 bg-primary/5 px-4 py-2.5">
          <Loader2 className="h-4 w-4 animate-spin text-primary" />
          <div>
            <p className="text-sm font-medium text-primary">Scanning...</p>
            <p className="text-[11px] text-muted-foreground">Verifying your cloud security posture. This may take a moment.</p>
          </div>
        </div>
      )}

      {/* Header with scan button */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-medium">Security Findings</h3>
          <p className="text-muted-foreground text-xs mt-0.5">
            {findings.length} total findings for this account
          </p>
        </div>
        <div className="flex items-center gap-2">
          <ScheduledScanPopover connectionId={connectionId} />
          <Button
            variant="outline"
            size="sm"
            onClick={handleRunScan}
            disabled={isScanning}
          >
            {isScanning ? (
              <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
            ) : (
              <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
            )}
            {isScanning ? 'Scanning...' : 'Scan'}
          </Button>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3">
        <StatCard
          icon={<ShieldCheck className="h-5 w-5 text-primary" />}
          value={passedFindings.length}
          label="Passed"
          accent="emerald"
        />
        <StatCard
          icon={<ShieldX className="h-5 w-5 text-red-500" />}
          value={failedFindings.length}
          label="Failed"
          accent="red"
        />
        <StatCard
          icon={<ShieldAlert className="h-5 w-5 text-muted-foreground" />}
          value={findings.length}
          label="Total"
          accent="gray"
        />
      </div>

      {/* Severity filter pills */}
      {failedFindings.length > 0 && (
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setSeverityFilter(null)}
            className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
              !severityFilter
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground hover:bg-muted/80'
            }`}
          >
            All ({failedFindings.length})
          </button>
          {Object.entries(SEVERITY_ORDER)
            .sort(([, a], [, b]) => a - b)
            .map(([sev]) =>
              severityCounts[sev] ? (
                <button
                  key={sev}
                  type="button"
                  onClick={() =>
                    setSeverityFilter(severityFilter === sev ? null : sev)
                  }
                  className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                    severityFilter === sev
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground hover:bg-muted/80'
                  }`}
                >
                  <span
                    className={`h-1.5 w-1.5 rounded-full ${SEVERITY_STYLES[sev]?.dot ?? 'bg-gray-400'}`}
                  />
                  {sev} ({severityCounts[sev]})
                </button>
              ) : null,
            )}
        </div>
      )}

      {/* Search */}
      {findings.length > 0 && (
        <div className="flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 w-72 focus-within:ring-2 focus-within:ring-primary/30">
          <Search className="h-3 w-3 shrink-0 text-muted-foreground/40" />
          <input
            type="text"
            placeholder="Search findings..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="min-w-0 flex-1 bg-transparent text-xs outline-none placeholder:text-muted-foreground/40"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="shrink-0 text-muted-foreground/40 hover:text-muted-foreground"
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </div>
      )}

      {/* Service findings */}
      {regularGroups.length > 0 && (
        <div className="space-y-3">
          {regularGroups.map((group) => {
            const isGroupExpanded = expandedGroups.has(group.serviceId);
            const hasFailures = group.findings.length > 0;

            return (
              <div key={group.serviceId} className="rounded-lg border">
                <button
                  type="button"
                  className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm font-medium transition-colors hover:bg-muted/40"
                  onClick={() => toggleGroup(group.serviceId)}
                >
                  <span className="text-muted-foreground shrink-0">
                    {isGroupExpanded ? (
                      <ChevronDown className="h-4 w-4" />
                    ) : (
                      <ChevronRight className="h-4 w-4" />
                    )}
                  </span>
                  <span className="flex-1">{group.name}</span>
                  <div className="flex items-center gap-2">
                    {group.failed > 1 && capabilities?.enabled && (
                      <span
                        role="button"
                        tabIndex={0}
                        onClick={(e) => {
                          e.stopPropagation();
                          setBatchServiceId(group.serviceId);
                        }}
                        onKeyDown={(e) => e.stopPropagation()}
                        className="inline-flex items-center gap-1 rounded-full border border-primary/20 bg-primary/5 px-2 py-0.5 text-[10px] font-medium text-primary transition-colors hover:bg-primary/10 cursor-pointer"
                      >
                        <Zap className="h-2.5 w-2.5" />
                        Fix All
                      </span>
                    )}
                    {group.passed > 0 && (
                      <span className="flex items-center gap-1 text-xs text-primary">
                        <ShieldCheck className="h-3.5 w-3.5" />
                        {group.passed}
                      </span>
                    )}
                    {group.failed > 0 && (
                      <span className="flex items-center gap-1 text-xs text-red-500">
                        <ShieldX className="h-3.5 w-3.5" />
                        {group.failed}
                      </span>
                    )}
                    {!hasFailures && group.failed === 0 && (
                      <Badge variant="outline" className="text-[10px] border-primary/20 bg-primary/10 text-primary">
                        All passed
                      </Badge>
                    )}
                  </div>
                </button>
                {isGroupExpanded && (
                  <div className="divide-y border-t">
                    {group.findings.length > 0 ? (
                      group.findings.map((finding) => {
                        const match = canFixFinding(finding);
                        return (
                          <FindingRow
                            key={finding.id}
                            finding={finding}
                            expanded={expandedIds.has(finding.id)}
                            onToggle={() => toggleExpanded(finding.id)}
                            remediationKey={match?.key ?? null}
                            remediationEnabled={match?.enabled ?? false}
                            capabilitiesLoaded={capabilitiesLoaded}
                            onFix={(key) =>
                              setRemediationTarget({
                                connectionId: finding.connectionId,
                                checkResultId: finding.id,
                                remediationKey: key,
                                findingTitle: finding.title ?? 'Finding',
                              })
                            }
                            onSetup={() => setShowSetupDialog(true)}
                          />
                        );
                      })
                    ) : (
                      <div className="flex items-center gap-2 px-4 py-3 text-xs text-primary">
                        <ShieldCheck className="h-3.5 w-3.5" />
                        All {group.passed} checks passed
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Security baseline findings */}
      {baselineGroups.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 pt-2">
            <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Security Baseline</h4>
            <div className="flex-1 border-t border-border/50" />
          </div>
          <p className="text-xs text-muted-foreground -mt-1">
            Core security checks that apply to every AWS account, regardless of which services you use.
          </p>
          {baselineGroups.map((group) => {
            const isGroupExpanded = expandedGroups.has(group.serviceId);
            const hasFailures = group.findings.length > 0;

            return (
              <div key={group.serviceId} className="rounded-lg border">
                <button
                  type="button"
                  className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm font-medium transition-colors hover:bg-muted/40"
                  onClick={() => toggleGroup(group.serviceId)}
                >
                  <span className="text-muted-foreground shrink-0">
                    {isGroupExpanded ? (
                      <ChevronDown className="h-4 w-4" />
                    ) : (
                      <ChevronRight className="h-4 w-4" />
                    )}
                  </span>
                  <span className="flex-1">{group.name}</span>
                  <div className="flex items-center gap-2">
                    {group.passed > 0 && (
                      <span className="flex items-center gap-1 text-xs text-primary">
                        <ShieldCheck className="h-3.5 w-3.5" />
                        {group.passed}
                      </span>
                    )}
                    {group.failed > 0 && (
                      <span className="flex items-center gap-1 text-xs text-red-500">
                        <ShieldX className="h-3.5 w-3.5" />
                        {group.failed}
                      </span>
                    )}
                    {!hasFailures && group.failed === 0 && (
                      <Badge variant="outline" className="text-[10px] border-primary/20 bg-primary/10 text-primary">
                        All passed
                      </Badge>
                    )}
                  </div>
                </button>
                {isGroupExpanded && (
                  <div className="divide-y border-t">
                    {group.findings.length > 0 ? (
                      group.findings.map((finding) => {
                        const match = canFixFinding(finding);
                        return (
                          <FindingRow
                            key={finding.id}
                            finding={finding}
                            expanded={expandedIds.has(finding.id)}
                            onToggle={() => toggleExpanded(finding.id)}
                            remediationKey={match?.key ?? null}
                            remediationEnabled={match?.enabled ?? false}
                            capabilitiesLoaded={capabilitiesLoaded}
                            onFix={(key) =>
                              setRemediationTarget({
                                connectionId: finding.connectionId,
                                checkResultId: finding.id,
                                remediationKey: key,
                                findingTitle: finding.title ?? 'Finding',
                              })
                            }
                            onSetup={() => setShowSetupDialog(true)}
                          />
                        );
                      })
                    ) : (
                      <div className="flex items-center gap-2 px-4 py-3 text-xs text-primary">
                        <ShieldCheck className="h-3.5 w-3.5" />
                        All {group.passed} checks passed
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* No search results */}
      {searchQuery && serviceGroups.length === 0 && findings.length > 0 && (
        <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed py-8">
          <Search className="text-muted-foreground/30 mb-2 h-8 w-8" />
          <p className="text-muted-foreground text-sm font-medium">
            No findings matching &quot;{searchQuery}&quot;
          </p>
          <button
            type="button"
            onClick={() => setSearchQuery('')}
            className="mt-2 text-xs text-primary hover:underline"
          >
            Clear search
          </button>
        </div>
      )}

      {/* GCP setup error — SCC not activated or org missing */}
      {scanError && (
        <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-5 dark:border-amber-800/50 dark:bg-amber-950/20">
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/40">
              <ShieldCheck className="h-5 w-5 text-amber-600 dark:text-amber-400" />
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium text-amber-800 dark:text-amber-300">
                {scanError.errorCode === 'SCC_NOT_ACTIVATED'
                  ? 'Security Command Center is not activated'
                  : scanError.errorCode === 'GCP_ORG_MISSING'
                    ? 'GCP Organization not detected'
                    : 'Setup required'}
              </p>
              <p className="text-xs text-amber-700 dark:text-amber-400 leading-relaxed">
                {scanError.message}
              </p>
              {scanError.errorCode === 'SCC_NOT_ACTIVATED' && (
                <a
                  href="https://console.cloud.google.com/security/command-center"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-md bg-amber-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-amber-700 transition-colors"
                >
                  Open GCP Console
                  <span aria-hidden>→</span>
                </a>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Empty state — never scanned */}
      {findings.length === 0 && !findingsResponse.isValidating && !lastRunAt && !scanCompleted && !scanError && (
        providerSlug === 'gcp' ? (
          <GcpSetupGuide
            connectionId={connectionId}
            hasOrgId={Boolean(variables?.organization_id)}
            onRunScan={handleRunScan}
            isScanning={isScanning}
          />
        ) : providerSlug === 'azure' ? (
          <AzureSetupGuide
            connectionId={connectionId}
            hasSubscriptionId={Boolean(variables?.subscription_id)}
            onRunScan={handleRunScan}
            isScanning={isScanning}
          />
        ) : (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-12">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted/50 mb-4">
              <ShieldCheck className="text-muted-foreground/40 h-6 w-6" />
            </div>
            <p className="text-sm font-medium">No scan results yet</p>
            <p className="text-muted-foreground mt-1 text-xs max-w-xs text-center">
              Run a security scan to check your cloud posture. You can configure which services to scan in the Services tab.
            </p>
          </div>
        )
      )}

      {/* All checks passed — clean posture (AWS: has passed findings; GCP: scan ran but 0 findings) */}
      {failedFindings.length === 0 && !findingsResponse.isValidating && (passedFindings.length > 0 || ((lastRunAt || scanCompleted) && findings.length === 0)) && serviceGroups.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-xl border border-primary/20 bg-primary/[0.03] py-10 dark:border-primary/10 dark:bg-primary/[0.02]">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 mb-4">
            <ShieldCheck className="h-7 w-7 text-primary" />
          </div>
          <p className="text-base font-semibold">
            Looking good!
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            {passedFindings.length > 0
              ? `All ${passedFindings.length} security checks passed — no issues found`
              : 'Security scan completed — no issues found'}
          </p>
        </div>
      )}

      {/* Remediation dialog */}
      {remediationTarget && (
        <RemediationDialog
          open={Boolean(remediationTarget)}
          onOpenChange={(open) => {
            if (!open) setRemediationTarget(null);
          }}
          connectionId={remediationTarget.connectionId}
          checkResultId={remediationTarget.checkResultId}
          remediationKey={remediationTarget.remediationKey}
          findingTitle={remediationTarget.findingTitle}
          providerSlug={providerSlug}
          guidedOnly={remediationTarget.guidedOnly}
          guidedSteps={remediationTarget.guidedSteps}
          risk={remediationTarget.risk}
          description={remediationTarget.description}
          onComplete={() => {
            toast.message('Re-scanning to verify fix...');
            handleRunScan();
          }}
        />
      )}

      {/* Batch remediation dialog */}
      {batchServiceId && (
        <BatchRemediationDialog
          open={Boolean(batchServiceId)}
          onOpenChange={(open) => {
            if (!open) setBatchServiceId(null);
          }}
          serviceName={batchTarget?.serviceName ?? 'Resuming'}
          findings={batchTarget?.findings ?? []}
          connectionId={connectionId}
          organizationId={orgId}
          activeBatch={activeBatch}
          onRunStarted={(info) => {
            setActiveBatch({ ...info, findings: [] });
          }}
          onComplete={() => {
            setActiveBatch(null);
            // Task already triggers a re-scan — just refresh the findings list
            findingsResponse.mutate();
          }}
        />
      )}

      {/* Remediation setup dialog */}
      <RemediationSetupDialog
        open={showSetupDialog}
        onOpenChange={setShowSetupDialog}
        orgId={orgId}
        connectionId={connectionId}
        onSaved={() => {
          setShowSetupDialog(false);
          // Reload capabilities after role ARN is saved
          const loadCapabilities = async () => {
            const resp = await api.get(
              `/v1/cloud-security/remediation/capabilities?connectionId=${connectionId}`,
            );
            if (!resp.error && resp.data) {
              setCapabilities(resp.data as RemediationCapabilities);
            }
          };
          loadCapabilities();
        }}
      />
    </div>
  );
}

function StatCard({
  icon,
  value,
  label,
  accent,
}: {
  icon: React.ReactNode;
  value: number;
  label: string;
  accent: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-lg border p-3.5">
      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-${accent}-50 dark:bg-${accent}-950/30`}>
        {icon}
      </div>
      <div>
        <p className="text-xl font-bold tabular-nums">{value}</p>
        <p className="text-muted-foreground text-xs">{label}</p>
      </div>
    </div>
  );
}

function RemediationSetupDialog({
  open,
  onOpenChange,
  orgId,
  connectionId,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orgId: string;
  connectionId: string;
  onSaved?: () => void;
}) {
  const api = useApi();
  const [copied, setCopied] = useState(false);
  const [roleArn, setRoleArn] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const finalScript = awsRemediationScript.replace(
    /YOUR_EXTERNAL_ID/g,
    orgId,
  );

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(finalScript);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [finalScript]);

  const handleSaveRoleArn = useCallback(async () => {
    if (!roleArn.trim() || !connectionId) return;

    const arnPattern = /^arn:aws:iam::\d{12}:role\/.+$/;
    if (!arnPattern.test(roleArn.trim())) {
      setSaveError('Invalid ARN format. Expected: arn:aws:iam::<account-id>:role/<role-name>');
      return;
    }

    setSaving(true);
    setSaveError(null);
    try {
      const resp = await api.put(`/v1/connections/${connectionId}/credentials`, {
        credentials: { remediationRoleArn: roleArn.trim() },
      });
      if (resp.error) {
        setSaveError(typeof resp.error === 'string' ? resp.error : 'Failed to save Role ARN');
        return;
      }
      toast.success('Remediation Role ARN saved');
      setRoleArn('');
      onSaved?.();
    } catch {
      setSaveError('Failed to save Role ARN');
    } finally {
      setSaving(false);
    }
  }, [api, connectionId, roleArn, onSaved]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Enable Auto-Remediation</DialogTitle>
          <DialogDescription>
            Set up a remediation IAM role to enable auto-fix capabilities for
            your AWS security findings.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          <div className="rounded-lg border bg-muted/30 p-4 space-y-4">
            <div className="flex items-center gap-2.5">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10">
                <Terminal className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium">Remediation Role Setup</p>
                <p className="text-xs text-muted-foreground">
                  Create a write-access IAM role for auto-fix
                </p>
              </div>
            </div>

            <div className="space-y-2.5">
              <div className="flex items-start gap-2.5">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[10px] font-semibold text-primary">
                  1
                </span>
                <p className="text-xs text-muted-foreground pt-0.5">
                  Copy the setup script and run it in AWS CloudShell
                </p>
              </div>
              <div className="flex items-start gap-2.5">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[10px] font-semibold text-primary">
                  2
                </span>
                <p className="text-xs text-muted-foreground pt-0.5">
                  Paste the{' '}
                  <span className="font-medium text-foreground">Role ARN</span>{' '}
                  from the output below
                </p>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleCopy}
                className="flex flex-1 select-none items-center justify-center gap-2 rounded-md bg-primary px-3 py-2.5 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/90"
              >
                {copied ? (
                  <>
                    <Check className="h-3.5 w-3.5" /> Copied!
                  </>
                ) : (
                  <>
                    <Copy className="h-3.5 w-3.5" /> Copy Script
                  </>
                )}
              </button>
              <a
                href="https://console.aws.amazon.com/cloudshell"
                target="_blank"
                rel="noopener noreferrer"
                className="flex flex-1 select-none items-center justify-center gap-2 rounded-md border px-3 py-2.5 text-xs font-medium transition-colors hover:bg-muted"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                Open CloudShell
              </a>
            </div>
          </div>

          {/* Role ARN input */}
          <div className="space-y-2">
            <label
              htmlFor="remediation-role-arn"
              className="text-xs font-medium"
            >
              Remediation Role ARN
            </label>
            <div className="flex gap-2">
              <input
                id="remediation-role-arn"
                type="text"
                placeholder="arn:aws:iam::123456789012:role/CompAI-Remediator"
                value={roleArn}
                onChange={(e) => {
                  setRoleArn(e.target.value);
                  setSaveError(null);
                }}
                className="flex-1 rounded-md border bg-background px-3 py-2 text-xs placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
              <Button
                size="sm"
                onClick={handleSaveRoleArn}
                disabled={!roleArn.trim() || saving}
              >
                {saving ? (
                  <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                ) : null}
                Save
              </Button>
            </div>
            {saveError && (
              <p className="text-[11px] text-red-600">{saveError}</p>
            )}
          </div>

          <p className="text-[10px] text-muted-foreground/70 text-center">
            The remediation role is separate from your audit role — your audit
            role stays read-only.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function FindingRow({
  finding,
  expanded,
  onToggle,
  remediationKey,
  remediationEnabled,
  capabilitiesLoaded,
  onFix,
  onSetup,
}: {
  finding: Finding;
  expanded: boolean;
  onToggle: () => void;
  remediationKey: string | null;
  remediationEnabled: boolean;
  capabilitiesLoaded: boolean;
  onFix: (key: string) => void;
  onSetup: () => void;
}) {
  const severity = finding.severity?.toLowerCase() ?? 'info';
  const styles = SEVERITY_STYLES[severity] ?? SEVERITY_STYLES.info;

  const handleFixClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!remediationKey) return;
    if (remediationEnabled) {
      onFix(remediationKey);
    } else {
      onSetup();
    }
  };

  const renderFixButton = () => {
    if (!capabilitiesLoaded) {
      return (
        <span onClick={(e) => e.stopPropagation()} className="shrink-0">
          <Loader2 className="h-3 w-3 animate-spin text-muted-foreground/40" />
        </span>
      );
    }

    if (!remediationKey) {
      return null;
    }

    // AI-powered: every finding with a key gets Fix
    return (
      <button
        type="button"
        onClick={handleFixClick}
        className="shrink-0 inline-flex items-center gap-1 rounded-full border border-primary/20 bg-primary/5 px-2.5 py-0.5 text-[10px] font-medium text-primary transition-colors hover:bg-primary/10"
      >
        <Wrench className="h-2.5 w-2.5" />
        Fix
      </button>
    );
  };

  return (
    <div>
      <div
        role="button"
        tabIndex={0}
        className="flex w-full cursor-pointer items-center gap-3 px-4 py-3 text-left text-sm transition-colors hover:bg-muted/40"
        onClick={(e) => {
          // Don't toggle if user clicked a button or interactive element
          const target = e.target as HTMLElement;
          if (target.closest('button') || target.closest('a') || target.closest('[role="button"]') || target.tagName === 'BUTTON') return;
          onToggle();
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onToggle();
          }
        }}
      >
        <span className="text-muted-foreground shrink-0">
          {expanded ? (
            <ChevronDown className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
        </span>
        <span className={`h-2 w-2 shrink-0 rounded-full ${styles.dot}`} />
        <span className="min-w-0 flex-1 truncate">
          {finding.title ?? 'Untitled finding'}
        </span>
        <span onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()}>
          {renderFixButton()}
        </span>
        <Badge variant="outline" className={`shrink-0 w-14 justify-center text-[10px] ${styles.badge}`}>
          {severity}
        </Badge>
      </div>
      {expanded && (
        <div className="space-y-3 border-t bg-muted/20 px-12 py-4 text-sm">
          {finding.description && (
            <p className="text-muted-foreground text-xs leading-relaxed">
              {finding.description}
            </p>
          )}
          {finding.remediation && (
            <div className="rounded-md border bg-background p-3">
              <p className="mb-1 text-xs font-medium">Remediation</p>
              <p className="text-muted-foreground text-xs leading-relaxed">
                {finding.remediation}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
