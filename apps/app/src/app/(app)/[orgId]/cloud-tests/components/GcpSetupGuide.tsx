'use client';

import { useApi } from '@/hooks/use-api';
import { Check, ExternalLink, Loader2, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';

interface GcpSetupGuideProps {
  connectionId: string;
  hasOrgId: boolean;
  onRunScan: () => void;
  isScanning: boolean;
}

interface SetupStep {
  name: string;
  success: boolean;
  error?: string;
}

const MANUAL_STEPS = [
  {
    title: 'Enable Security Command Center',
    description: 'SCC Standard tier (free) must be activated on your GCP organization.',
    link: 'https://console.cloud.google.com/security/command-center',
    linkText: 'Open SCC Console',
  },
  {
    title: 'Grant Findings Viewer role',
    description: 'Your account needs the Security Center Findings Viewer role at the organization level.',
    link: 'https://console.cloud.google.com/iam-admin/iam',
    linkText: 'Open IAM',
  },
  {
    title: 'Enable required APIs',
    description: 'Cloud Resource Manager and Service Usage APIs must be enabled.',
    link: 'https://console.cloud.google.com/apis/library',
    linkText: 'API Library',
  },
];

const AUTO_FIX_ROLES = [
  { role: 'Storage Admin', scope: 'Cloud Storage fixes' },
  { role: 'Compute Security Admin', scope: 'Firewall and network fixes' },
  { role: 'Cloud SQL Admin', scope: 'Database configuration fixes' },
  { role: 'Cloud KMS Admin', scope: 'Encryption key fixes' },
];

export function GcpSetupGuide({
  connectionId,
  hasOrgId,
  onRunScan,
  isScanning,
}: GcpSetupGuideProps) {
  const api = useApi();
  const [isSettingUp, setIsSettingUp] = useState(false);
  const [setupResult, setSetupResult] = useState<{
    email: string | null;
    steps: SetupStep[];
    organizationId?: string;
  } | null>(null);

  const ranRef = useRef(false);

  // Auto-run setup on first mount
  useEffect(() => {
    if (ranRef.current) return;
    ranRef.current = true;
    handleAutoSetup();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleAutoSetup = async () => {
    setIsSettingUp(true);
    try {
      const resp = await api.post<{
        email: string | null;
        steps: SetupStep[];
        organizationId?: string;
      }>(`/v1/cloud-security/setup-gcp/${connectionId}`, {});

      if (resp.error) {
        toast.error(typeof resp.error === 'string' ? resp.error : 'Setup failed');
        return;
      }

      if (resp.data) {
        setSetupResult(resp.data);
        const succeeded = resp.data.steps.filter((s) => s.success).length;
        const total = resp.data.steps.length;
        if (succeeded === total) {
          toast.success('GCP setup complete — running first scan...');
          onRunScan();
        } else {
          toast.message(`${succeeded}/${total} steps completed. See details below.`);
        }
      }
    } catch {
      toast.error('Setup failed');
    } finally {
      setIsSettingUp(false);
    }
  };

  const allStepsSucceeded = setupResult?.steps.every((s) => s.success);

  return (
    <div className="space-y-4">
      <div className="rounded-xl border p-5 space-y-4">
        <div>
          <h3 className="text-sm font-semibold">Get started with GCP scanning</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            We need to enable a few things in your GCP account. You can do it automatically or follow the manual steps.
          </p>
        </div>

        {/* Auto-setup in progress */}
        {!setupResult && (
          <div className="space-y-3">
            <StepRow done label="Connected via OAuth" />
            {hasOrgId && <StepRow done label="Organization detected" />}

            <div className="flex items-center justify-center gap-2 py-3">
              <Loader2 className="h-4 w-4 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Setting up GCP scanning...</p>
            </div>
          </div>
        )}

        {/* Setup results */}
        {setupResult && (
          <div className="space-y-2">
            <StepRow done label="Connected via OAuth" />
            {setupResult.organizationId && (
              <StepRow done label={`Organization: ${setupResult.organizationId}`} />
            )}
            {setupResult.email && (
              <StepRow done label={`Account: ${setupResult.email}`} />
            )}
            {setupResult.steps.map((step, i) => (
              <StepRow
                key={i}
                done={step.success}
                failed={!step.success}
                label={step.name}
                error={step.error}
              />
            ))}
          </div>
        )}

        {/* Manual fallback for failed steps */}
        {setupResult && !allStepsSucceeded && (
          <div className="rounded-lg border border-amber-200 bg-amber-50/50 p-3 dark:border-amber-800/50 dark:bg-amber-950/20">
            <p className="text-xs font-medium text-amber-800 dark:text-amber-300 mb-2">
              Some steps need manual setup:
            </p>
            <div className="space-y-1.5">
              {MANUAL_STEPS.map((step, i) => {
                const result = setupResult.steps.find((s) => s.name.toLowerCase().includes(step.title.toLowerCase().split(' ')[1] ?? ''));
                if (result?.success) return null;
                return (
                  <div key={i} className="flex items-center justify-between">
                    <span className="text-xs text-amber-700 dark:text-amber-400">{step.title}</span>
                    <a
                      href={step.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-[11px] text-primary hover:underline"
                    >
                      {step.linkText} <ExternalLink className="h-2.5 w-2.5" />
                    </a>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Run scan button — only shown if setup partially failed */}
        {setupResult && !allStepsSucceeded && (
          <button
            type="button"
            onClick={onRunScan}
            disabled={isScanning}
            className="w-full rounded-lg border bg-background px-4 py-2.5 text-sm font-medium text-foreground hover:bg-muted/50 transition-colors disabled:opacity-50"
          >
            {isScanning ? 'Scanning...' : 'Try Scanning Anyway'}
          </button>
        )}
      </div>

      {/* Auto-fix roles info */}
      <details className="rounded-xl border">
        <summary className="cursor-pointer px-5 py-3 text-sm font-medium hover:bg-muted/30 transition-colors">
          Optional: IAM roles for auto-fix
        </summary>
        <div className="px-5 pb-4 space-y-2">
          <p className="text-xs text-muted-foreground">
            Auto-fix requires additional IAM roles. These are only needed when applying fixes — scanning works without them.
            We&apos;ll show the exact <code className="font-mono">gcloud</code> command when a fix needs a missing permission.
          </p>
          <div className="space-y-1.5">
            {AUTO_FIX_ROLES.map((r) => (
              <div key={r.role} className="flex items-center justify-between text-xs">
                <code className="font-mono text-[11px]">{r.role}</code>
                <span className="text-muted-foreground">{r.scope}</span>
              </div>
            ))}
          </div>
        </div>
      </details>
    </div>
  );
}

function StepRow({
  done,
  failed,
  label,
  error,
}: {
  done?: boolean;
  failed?: boolean;
  label: string;
  error?: string;
}) {
  return (
    <div className="flex items-start gap-2.5">
      <div
        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full mt-0.5 ${
          done
            ? 'bg-primary/10'
            : failed
              ? 'bg-red-100 dark:bg-red-900/30'
              : 'border border-muted-foreground/30'
        }`}
      >
        {done && <Check className="h-3 w-3 text-primary" />}
        {failed && <X className="h-3 w-3 text-red-500" />}
      </div>
      <div>
        <p className={`text-sm ${done ? 'text-muted-foreground' : failed ? 'text-foreground' : 'font-medium'}`}>
          {label}
        </p>
        {error && (
          <p className="text-[11px] text-red-500 mt-0.5">{error}</p>
        )}
      </div>
    </div>
  );
}
