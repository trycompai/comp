'use client';

import { useApi } from '@/hooks/use-api';
import { Check, ExternalLink, Loader2, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';

interface AzureSetupGuideProps {
  connectionId: string;
  hasSubscriptionId: boolean;
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
    title: 'Ensure you have a Subscription',
    description: 'An active Azure subscription is required.',
    link: 'https://portal.azure.com/#blade/Microsoft_Azure_Billing/SubscriptionsBlade',
    linkText: 'Subscriptions',
  },
  {
    title: 'Assign Security Reader role',
    description: 'Your account needs Security Reader on the subscription.',
    link: 'https://portal.azure.com/#blade/Microsoft_Azure_Billing/SubscriptionsBlade',
    linkText: 'Subscription → IAM',
  },
  {
    title: 'Enable Microsoft Defender for Cloud',
    description: 'Enable at least the free tier of Defender for Cloud.',
    link: 'https://portal.azure.com/#blade/Microsoft_Azure_Security/SecurityMenuBlade/EnvironmentSettings',
    linkText: 'Defender Settings',
  },
];

export function AzureSetupGuide({
  connectionId,
  hasSubscriptionId,
  onRunScan,
  isScanning,
}: AzureSetupGuideProps) {
  const api = useApi();
  const [isSettingUp, setIsSettingUp] = useState(false);
  const [setupResult, setSetupResult] = useState<{
    steps: SetupStep[];
    subscriptionId?: string;
    subscriptionName?: string;
  } | null>(null);

  const ranRef = useRef(false);

  // Auto-run setup on first mount — no user action needed
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
        steps: SetupStep[];
        subscriptionId?: string;
        subscriptionName?: string;
      }>(`/v1/cloud-security/setup-azure/${connectionId}`, {});

      if (resp.error) {
        toast.error(typeof resp.error === 'string' ? resp.error : 'Setup failed');
        return;
      }

      if (resp.data) {
        setSetupResult(resp.data);
        const succeeded = resp.data.steps.filter((s) => s.success).length;
        const total = resp.data.steps.length;
        if (succeeded === total) {
          toast.success('Azure setup complete — running first scan...');
          // Auto-run scan when everything passes
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
          <h3 className="text-sm font-semibold">Get started with Azure scanning</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            We&apos;ll detect your subscription and verify access. You can do it automatically or follow the manual steps.
          </p>
        </div>

        {/* Auto-setup in progress */}
        {!setupResult && (
          <div className="space-y-3">
            <StepRow done label="Connected via Microsoft OAuth" />
            {hasSubscriptionId && <StepRow done label="Subscription detected" />}

            <div className="flex items-center justify-center gap-2 py-3">
              <Loader2 className="h-4 w-4 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Verifying access and configuring...</p>
            </div>
          </div>
        )}

        {/* Setup results */}
        {setupResult && (
          <div className="space-y-2">
            <StepRow done label="Connected via Microsoft OAuth" />
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

        {/* Manual fallback */}
        {setupResult && !allStepsSucceeded && (
          <div className="rounded-lg border border-amber-200 bg-amber-50/50 p-3 dark:border-amber-800/50 dark:bg-amber-950/20">
            <p className="text-xs font-medium text-amber-800 dark:text-amber-300 mb-2">
              Some checks need attention:
            </p>
            <div className="space-y-1.5">
              {MANUAL_STEPS.map((step, i) => (
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
              ))}
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

      {/* Auto-fix info — shown only before setup runs */}
      {!setupResult && (
        <div className="rounded-xl border px-5 py-3">
          <p className="text-xs text-muted-foreground">
            <span className="font-medium text-foreground">Scanning</span> works with Reader + Security Reader roles.{' '}
            <span className="font-medium text-foreground">Auto-fix</span> requires Contributor-level access.
            We&apos;ll detect your permissions automatically during setup.
          </p>
        </div>
      )}
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
