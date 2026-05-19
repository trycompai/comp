'use client';

import { Cloud, ShieldCheck } from 'lucide-react';

/**
 * String constants for the two AWS scan-engine modes. Mirrors the
 * AwsScanMode type in apps/api/src/cloud-security/aws-scan-mode.ts —
 * the single source of truth for these values lives on the API side
 * (because that's what gets validated server-side), but we duplicate
 * the literals here so the onboarding UI doesn't import API code.
 *
 * If you add a new mode, update BOTH files and the type assertion in
 * the parent EmptyStateOnboarding that passes this to createConnection.
 */
export type AwsScanModeChoice = 'comp_scanners' | 'security_hub';

export const DEFAULT_AWS_SCAN_MODE_CHOICE: AwsScanModeChoice = 'comp_scanners';

interface AwsScanModeStepProps {
  /** Currently-selected mode. */
  value: AwsScanModeChoice;
  /** Called when the customer picks a different option. */
  onChange: (next: AwsScanModeChoice) => void;
  /** When true, disables interaction (e.g., during connection creation). */
  disabled?: boolean;
}

/**
 * AWS-onboarding step that lets the customer choose which engine
 * performs their cloud security scans. Two radio cards, mutually
 * exclusive:
 *
 *   1. Comp AI Scanners (default) — our service adapters running
 *      directly against AWS APIs, free.
 *   2. AWS Security Hub — read findings from the customer's existing
 *      Security Hub deployment, surface native NIST 800-53 / CIS / PCI
 *      mapping.
 *
 * Note: Fix button works for findings from BOTH modes (Security Hub
 * findings just get a small disclosure banner in the Fix dialog).
 * Fix support isn't a differentiator and isn't listed as a card badge.
 *
 * Pure UI — no API calls, no side effects. The parent owns state and
 * passes the choice into the createConnection payload via the
 * `awsScanMode` variable.
 */
export function AwsScanModeStep({
  value,
  onChange,
  disabled,
}: AwsScanModeStepProps) {
  return (
    <fieldset className="space-y-3" disabled={disabled}>
      <legend className="sr-only">AWS scan engine</legend>
      <ScanModeCard
        modeValue="comp_scanners"
        selected={value === 'comp_scanners'}
        onSelect={() => onChange('comp_scanners')}
        icon={<Cloud className="h-4 w-4" />}
        title="Comp AI Scanners"
        subtitle="Recommended"
        description={
          'Run our security checks directly against your AWS account. ' +
          'No additional AWS cost. Covers IAM, CloudTrail, S3, EC2, RDS, ' +
          'KMS, GuardDuty, and 40+ other services.'
        }
        badges={['Free']}
      />
      <ScanModeCard
        modeValue="security_hub"
        selected={value === 'security_hub'}
        onSelect={() => onChange('security_hub')}
        icon={<ShieldCheck className="h-4 w-4" />}
        title="AWS Security Hub"
        subtitle="Read findings from your existing Security Hub"
        description={
          'Use the findings your Security Hub deployment already produces. ' +
          'Surfaces NIST 800-53 / CIS / PCI control mappings natively. ' +
          'Requires Security Hub to be enabled in your AWS account ' +
          '(AWS bills per finding ingested + per control checked).'
        }
        badges={[
          'Native NIST / CIS / PCI mapping',
          'Requires Security Hub subscription',
        ]}
      />
    </fieldset>
  );
}

function ScanModeCard({
  modeValue,
  selected,
  onSelect,
  icon,
  title,
  subtitle,
  description,
  badges,
}: {
  modeValue: AwsScanModeChoice;
  selected: boolean;
  onSelect: () => void;
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  description: string;
  badges: string[];
}) {
  return (
    <label
      className={`flex cursor-pointer items-start gap-3 rounded-lg border p-4 transition-colors ${
        selected
          ? 'border-primary bg-primary/[0.03] ring-1 ring-primary/30'
          : 'border-border hover:border-primary/40 hover:bg-muted/30'
      }`}
    >
      <input
        type="radio"
        name="aws-scan-mode"
        value={modeValue}
        checked={selected}
        onChange={onSelect}
        className="mt-1 h-4 w-4 accent-primary"
      />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-primary">{icon}</span>
          <span className="text-sm font-semibold">{title}</span>
          <span className="text-xs text-muted-foreground">{subtitle}</span>
        </div>
        <p className="mt-1.5 text-xs text-muted-foreground leading-relaxed">
          {description}
        </p>
        {badges.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {badges.map((badge) => (
              <span
                key={badge}
                className="inline-flex items-center rounded border bg-background px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground"
              >
                {badge}
              </span>
            ))}
          </div>
        )}
      </div>
    </label>
  );
}
