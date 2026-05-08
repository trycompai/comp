'use client';

import { Button } from '@trycompai/ui/button';
import { Check, Copy, ExternalLink, RefreshCw, ShieldAlert } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

interface PermissionErrorPanelProps {
  error: string;
  /** Missing IAM actions extracted from the error (preferred). */
  missingActions?: string[];
  /** Planned API calls from the preview (fallback for AWS). */
  apiCalls?: string[];
  /** Ready-to-paste fix script from backend (preferred over client-side). */
  fixScript?: string;
  /** Cloud provider — affects script format and links. */
  provider?: 'aws' | 'gcp' | 'azure';
  /** Retry the remediation after the user fixes permissions. */
  onRetry?: () => void;
  isRetrying?: boolean;
  isWaiting?: boolean;
}

/** Extract IAM actions from the error message itself (client-side parsing). */
function extractActionsFromError(error: string): string[] {
  const patterns = [
    // AWS patterns
    /not authorized to perform:\s*([\w:*]+)/i,
    /required\s+([\w:*]+)\s+permission/i,
    /denied.*?(?:action|for):\s*([\w:*]+)/i,
    // GCP patterns
    /permission\s+'([\w.]+)'/i,
    /does not have\s+([\w.]+)\s+access/i,
    /'([\w.]+)'\s*denied/i,
  ];
  const actions = new Set<string>();
  for (const pattern of patterns) {
    const match = error.match(pattern);
    if (match?.[1]) actions.add(match[1]);
  }
  return [...actions];
}

/** Known AWS service-linked role patterns. */
const SERVICE_LINKED_ROLE_PATTERNS: { pattern: RegExp; service: string; command: string }[] = [
  { pattern: /config.*service-linked role/i, service: 'AWS Config', command: 'aws iam create-service-linked-role --aws-service-name config.amazonaws.com' },
  { pattern: /guardduty.*service-linked role|service-linked role.*guardduty/i, service: 'GuardDuty', command: 'aws iam create-service-linked-role --aws-service-name guardduty.amazonaws.com' },
  { pattern: /inspector.*service-linked role/i, service: 'Inspector', command: 'aws iam create-service-linked-role --aws-service-name inspector2.amazonaws.com' },
  { pattern: /macie.*service-linked role/i, service: 'Macie', command: 'aws iam create-service-linked-role --aws-service-name macie.amazonaws.com' },
];

function detectServiceLinkedRole(error: string): { service: string; command: string } | null {
  if (!error.toLowerCase().includes('service-linked role')) return null;
  for (const entry of SERVICE_LINKED_ROLE_PATTERNS) {
    if (entry.pattern.test(error)) return entry;
  }
  return null;
}

function buildAwsFixScript(actions: string[]): string | null {
  if (actions.length === 0) return null;
  const policy = JSON.stringify({
    Version: '2012-10-17',
    Statement: [{ Effect: 'Allow', Action: actions, Resource: '*' }],
  });
  return `aws iam put-role-policy --role-name CompAI-Remediator --policy-name CompAI-AutoFix --policy-document '${policy}'`;
}

function isAzureError(error: string): boolean {
  return (
    error.includes('AuthorizationFailed') ||
    error.includes('management.azure.com') ||
    error.includes('does not have authorization')
  );
}

function isGcpError(error: string): boolean {
  return (
    error.includes('PERMISSION_DENIED') ||
    error.includes('googleapis.com') ||
    /does not have\s+[\w.]+\s+access/i.test(error) ||
    /permission\s+'[\w.]+'/i.test(error)
  );
}

export function PermissionErrorPanel({
  error,
  missingActions,
  apiCalls,
  fixScript: backendScript,
  provider,
  onRetry,
  isRetrying,
  isWaiting,
}: PermissionErrorPanelProps) {
  const [copied, setCopied] = useState(false);

  // Auto-detect provider if not specified
  const detectedProvider = provider ?? (isAzureError(error) ? 'azure' : isGcpError(error) ? 'gcp' : 'aws');
  const isGcp = detectedProvider === 'gcp';
  const isAzure = detectedProvider === 'azure';

  const serviceLinkedRole = isGcp ? null : detectServiceLinkedRole(error);
  const isPermissionError =
    serviceLinkedRole !== null ||
    error.includes('not authorized') ||
    error.includes('AccessDenied') ||
    error.includes('access denied') ||
    error.includes('PERMISSION_DENIED') ||
    error.includes('Permission denied') ||
    (error.includes('required') && error.includes('permission'));

  if (!isPermissionError) {
    // Truncate long AI-generated messages for clean UX
    const shortError = error.length > 150
      ? error.slice(0, 150).replace(/\s+\S*$/, '') + '…'
      : error;
    const hasDetails = error.length > 150;

    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-950">
        <p className="text-sm font-medium text-red-800 dark:text-red-300">Fix could not be applied</p>
        <p className="text-xs text-red-700/80 dark:text-red-400/80 mt-1">{shortError}</p>
        {hasDetails && (
          <details className="mt-2">
            <summary className="text-[11px] text-red-600 dark:text-red-400 cursor-pointer hover:underline">
              Show full details
            </summary>
            <p className="text-[11px] text-red-600/70 dark:text-red-400/70 mt-1 whitespace-pre-wrap">{error}</p>
          </details>
        )}
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            disabled={isRetrying}
            className="mt-3 rounded-md bg-red-100 px-3 py-1.5 text-xs font-medium text-red-800 hover:bg-red-200 dark:bg-red-900 dark:text-red-300 dark:hover:bg-red-800 transition-colors disabled:opacity-50"
          >
            {isRetrying ? 'Retrying...' : 'Retry'}
          </button>
        )}
      </div>
    );
  }

  // Priority: service-linked role > backend script > client-parsed
  const parsedFromError = extractActionsFromError(error);
  const actions = missingActions?.length
    ? missingActions
    : parsedFromError.length
      ? parsedFromError
      : (apiCalls ?? []);

  const script = serviceLinkedRole
    ? serviceLinkedRole.command
    : backendScript ?? (isGcp || isAzure ? null : buildAwsFixScript(actions));

  const shellName = isAzure ? 'Cloud Shell' : isGcp ? 'Cloud Shell' : 'CloudShell';
  const shellUrl = isAzure
    ? 'https://portal.azure.com/#cloudshell/'
    : isGcp
      ? 'https://console.cloud.google.com/cloudshell'
      : 'https://console.aws.amazon.com/cloudshell';
  const propagationText = isAzure
    ? 'Role assignment changes in Azure may take a few minutes to propagate.'
    : isGcp
      ? 'IAM changes in GCP may take a few minutes to propagate.'
      : 'IAM permission changes can take up to 10 seconds to propagate in AWS.';

  const handleCopy = () => {
    if (!script) return;
    navigator.clipboard.writeText(script);
    setCopied(true);
    toast.success('Script copied to clipboard');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-3">
      <div className="rounded-md border border-amber-200 bg-amber-50 p-3 dark:border-amber-800 dark:bg-amber-950">
        <div className="flex items-start gap-2.5">
          <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
          <div className="space-y-1.5">
            <p className="text-sm font-medium text-amber-800 dark:text-amber-300">
              {serviceLinkedRole
                ? 'Missing Service-Linked Role'
                : isGcp
                  ? 'Missing GCP IAM Permission'
                  : 'Missing IAM Permission'}
            </p>
            <p className="text-xs text-amber-700 dark:text-amber-400 leading-relaxed">
              {serviceLinkedRole
                ? `${serviceLinkedRole.service} requires a service-linked role. Create it with the command below, then retry.`
                : isGcp
                  ? (
                    <>
                      Your GCP account is missing permissions needed for this fix.
                      {actions.length > 0 && (
                        <>
                          {' '}Missing:{' '}
                          {actions.map((a, i) => (
                            <span key={a}>
                              {i > 0 && ', '}
                              <code className="font-mono">{a}</code>
                            </span>
                          ))}
                        </>
                      )}
                    </>
                  )
                  : (
                    <>
                      The remediation role is missing permissions needed for this fix.
                      {actions.length > 0 && (
                        <>
                          {' '}Required:{' '}
                          {actions.map((a, i) => (
                            <span key={a}>
                              {i > 0 && ', '}
                              <code className="font-mono">{a}</code>
                            </span>
                          ))}
                        </>
                      )}
                    </>
                  )}
            </p>
          </div>
        </div>
      </div>

      {script && (
        <div className="rounded-md border bg-muted/30 p-3 space-y-2.5">
          <p className="text-xs font-medium">
            Run this in {isAzure ? 'Azure' : isGcp ? 'Google' : 'AWS'} {shellName} to add the permission:
          </p>
          <pre className="overflow-x-auto rounded bg-muted p-2.5 text-[11px] leading-relaxed whitespace-pre-wrap break-all">
            {script}
          </pre>
          {isGcp && (
            <p className="text-[10px] text-muted-foreground/80">
              Replace <code className="font-mono">YOUR_EMAIL</code> with your Google account email and <code className="font-mono">YOUR_PROJECT_ID</code> with your GCP project ID.
            </p>
          )}
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={handleCopy}
              className="flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            >
              {copied ? (
                <><Check className="h-3 w-3" /> Copied!</>
              ) : (
                <><Copy className="h-3 w-3" /> Copy Script</>
              )}
            </button>
            <a
              href={shellUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-medium transition-colors hover:bg-muted"
            >
              <ExternalLink className="h-3 w-3" />
              Open {shellName}
            </a>
            {onRetry && (
              <Button
                variant="outline"
                size="sm"
                onClick={onRetry}
                disabled={isRetrying || isWaiting}
                className="h-auto px-3 py-1.5 text-xs"
              >
                {(isRetrying || isWaiting) ? (
                  <RefreshCw className="mr-1.5 h-3 w-3 animate-spin" />
                ) : (
                  <RefreshCw className="mr-1.5 h-3 w-3" />
                )}
                {isWaiting ? `Waiting for ${isAzure ? 'Azure' : isGcp ? 'GCP' : 'AWS'}...` : isRetrying ? 'Retrying...' : 'Retry'}
              </Button>
            )}
          </div>
          <p className="text-[10px] text-muted-foreground/60">
            {propagationText}
          </p>
        </div>
      )}
    </div>
  );
}
