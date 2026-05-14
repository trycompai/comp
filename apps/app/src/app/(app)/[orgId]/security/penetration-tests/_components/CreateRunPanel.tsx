'use client';

import type { PentestCheck, PentestCreateRequest } from '@/lib/security/penetration-tests-client';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  Button,
} from '@trycompai/design-system';
import { ArrowRight } from '@trycompai/design-system/icons';
import { useRouter } from 'next/navigation';
import type { FormEvent } from 'react';
import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';
import { AuthorizationConsentField } from './AuthorizationConsentField';
import { CreateRunTargetFields } from './CreateRunTargetFields';
import { RunExpectationSummary } from './RunExpectationSummary';
import { ScanAdvancedOptions } from './ScanAdvancedOptions';
import { ScanProfilePicker } from './ScanProfilePicker';
import {
  estimateRuntime,
  resolveEffectiveScanMode,
  scanProfiles,
  withRequiredDiscovery,
  type ScanProfileId,
} from './scan-profiles';

interface CreateRunPanelProps {
  orgId: string;
  onSubmit: (payload: PentestCreateRequest) => Promise<{ id: string }>;
  isSubmitting?: boolean;
  balance?: number;
  planRequired?: boolean;
  quotaLabel?: 'Plan';
}

const createRunSchema = z.object({
  targetUrl: z.string().min(1, 'Target URL is required.'),
  repoUrl: z.string().optional(),
  selectedProfile: z.enum(['quick', 'standard', 'deep']),
  scanDepth: z.enum(['quick', 'standard', 'deep']),
  evidenceLevel: z.enum(['report_only', 'safe_proof', 'impact_proof']),
  checks: z
    .array(
      z.enum([
        'discovery',
        'secrets_info_disclosure',
        'technology_config',
        'xss',
        'injection',
        'authentication',
        'authorization',
        'idor_bola',
        'ssrf_xxe',
        'csrf',
        'race_conditions',
        'business_logic',
      ]),
    )
    .min(1, 'Select at least one check.'),
  authorized: z
    .boolean()
    .refine((value) => value === true, {
      message: 'Confirm you own or are authorized to test this target.',
    }),
});

export type CreateRunForm = z.infer<typeof createRunSchema>;

export function CreateRunPanel({
  orgId,
  onSubmit,
  isSubmitting,
  balance,
  planRequired,
  quotaLabel = 'Plan',
}: CreateRunPanelProps) {
  const router = useRouter();
  const [advancedOpen, setAdvancedOpen] = useState(true);
  const [confirmationOpen, setConfirmationOpen] = useState(false);
  const canCreate = balance === undefined ? true : balance > 0;
  const standardDefaults = scanProfiles.standard;
  const form = useForm<CreateRunForm>({
    resolver: zodResolver(createRunSchema),
    defaultValues: {
      targetUrl: '',
      repoUrl: '',
      selectedProfile: 'standard',
      scanDepth: standardDefaults.scanDepth,
      evidenceLevel: standardDefaults.evidenceLevel,
      checks: standardDefaults.checks,
      authorized: false,
    },
  });
  const evidenceLevel = form.watch('evidenceLevel');
  const checks = form.watch('checks');
  const authorized = form.watch('authorized');
  const effectiveMode = useMemo(
    () =>
      resolveEffectiveScanMode({
        evidenceLevel,
        checks,
      }),
    [checks, evidenceLevel],
  );
  const runtimeEstimate = useMemo(
    () =>
      estimateRuntime({
        effectiveMode,
        evidenceLevel,
        checks,
      }),
    [checks, effectiveMode, evidenceLevel],
  );
  const effectiveLabel =
    effectiveMode === 'custom' ? 'Custom' : effectiveMode[0].toUpperCase() + effectiveMode.slice(1);

  const handleCancel = () => {
    router.push(`/${orgId}/security/penetration-tests`);
  };

  const handleProfileChange = (profile: ScanProfileId) => {
    const defaults = scanProfiles[profile];
    form.setValue('selectedProfile', profile, { shouldDirty: true });
    form.setValue('scanDepth', defaults.scanDepth, { shouldDirty: true });
    form.setValue('evidenceLevel', defaults.evidenceLevel, {
      shouldDirty: true,
    });
    form.setValue('checks', defaults.checks, { shouldDirty: true });
  };

  const handleChecksChange = (nextChecks: PentestCheck[]) => {
    form.setValue('checks', withRequiredDiscovery(nextChecks), {
      shouldDirty: true,
      shouldValidate: true,
    });
  };

  const handleSubmitForm = async (values: CreateRunForm, confirmed = false) => {
    if (!canCreate) {
      toast.error(
        planRequired
          ? 'Start a plan or free trial to run penetration tests.'
          : 'No pentest runs remaining. Choose a plan to continue.',
      );
      router.push(`/${orgId}/settings/billing/add-ons/penetration-tests`);
      return;
    }

    const resolvedMode = resolveEffectiveScanMode({
      evidenceLevel: values.evidenceLevel,
      checks: values.checks,
    });
    const submitScanDepth =
      resolvedMode === 'custom' ? values.scanDepth : scanProfiles[resolvedMode].scanDepth;

    if (!confirmed && values.evidenceLevel === 'impact_proof') {
      setConfirmationOpen(true);
      return;
    }

    const normalized = normalizeUrl(values.targetUrl);
    if (!normalized) {
      toast.error('Target URL is required.');
      return;
    }

    try {
      const result = await onSubmit({
        targetUrl: normalized,
        ...(values.repoUrl?.trim() ? { repoUrl: values.repoUrl.trim() } : {}),
        scanDepth: submitScanDepth,
        evidenceLevel: values.evidenceLevel,
        checks: values.checks,
      });
      router.push(`/${orgId}/security/penetration-tests/${encodeURIComponent(result.id)}`);
    } catch {
      // onSubmit handles its own toast.
    }
  };

  const handleConfirmSubmit = () => {
    setConfirmationOpen(false);
    void handleSubmitForm(form.getValues(), true);
  };

  const handleFormSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canCreate) {
      void handleSubmitForm(form.getValues());
      return;
    }

    void form.handleSubmit((values) => handleSubmitForm(values))(event);
  };

  return (
    <div className="min-h-0 overflow-y-auto">
      <div className="mx-auto w-full max-w-[760px] px-3 py-4 sm:px-6 sm:py-10">
        <form
          noValidate
          onSubmit={handleFormSubmit}
          className="rounded-[var(--radius)] border border-border bg-card p-4 shadow-[0_24px_48px_-12px_rgba(0,0,0,0.12)] sm:p-8"
        >
          <div className="mb-1.5 text-[10px] font-bold uppercase tracking-[0.1em] text-muted-foreground">
            New scan
          </div>
          <div className="mb-1 text-[20px] font-normal">Start a penetration test</div>
          <p className="mb-5 text-xs leading-relaxed text-muted-foreground">
            Findings stream in as they're discovered. You don't need to keep this page open.
          </p>

          {!canCreate && (
            <div className="mb-5 rounded border border-destructive/40 bg-destructive/5 p-3.5 text-xs leading-relaxed text-destructive">
              {planRequired
                ? 'Start a plan or free trial to run penetration tests.'
                : 'No pentest runs remaining. Choose a plan to continue.'}
            </div>
          )}

          <ScanProfilePicker
            activeProfile={effectiveMode === 'custom' ? null : effectiveMode}
            headerLabel={effectiveLabel}
            runtimeEstimate={runtimeEstimate}
            onChange={handleProfileChange}
          />

          <CreateRunTargetFields form={form} />

          <ScanAdvancedOptions
            open={advancedOpen}
            evidenceLevel={evidenceLevel}
            checks={checks}
            onOpenChange={setAdvancedOpen}
            onEvidenceLevelChange={(nextEvidenceLevel) =>
              form.setValue('evidenceLevel', nextEvidenceLevel, {
                shouldDirty: true,
              })
            }
            onChecksChange={handleChecksChange}
          />

          <RunExpectationSummary
            runtimeEstimate={runtimeEstimate}
            effectiveLabel={effectiveLabel}
            checksError={form.formState.errors.checks?.message}
          />

          <AuthorizationConsentField
            checked={authorized}
            onCheckedChange={(nextChecked) =>
              form.setValue('authorized', nextChecked, {
                shouldDirty: true,
                shouldValidate: true,
              })
            }
            errorMessage={form.formState.errors.authorized?.message}
          />

          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <div className="w-full sm:w-auto">
              <Button type="button" variant="outline" onClick={handleCancel} disabled={isSubmitting}>
                Cancel
              </Button>
            </div>
            <div className="w-full sm:w-auto">
              <Button
                type="submit"
                loading={isSubmitting}
                disabled={isSubmitting}
                iconRight={canCreate ? <ArrowRight /> : undefined}
              >
                {canCreate ? `Start scan (${quotaLabel})` : 'Choose plan'}
              </Button>
            </div>
          </div>
        </form>
      </div>

      <AlertDialog open={confirmationOpen} onOpenChange={setConfirmationOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm impact-proof scan</AlertDialogTitle>
            <AlertDialogDescription>
              Impact-proof validation actively exploits findings to demonstrate real-world
              impact. This may trigger WAF alerts, rate limits, or temporary service
              degradation on the target. Proceed only if you've coordinated with the target
              owner.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmSubmit}>
              Run impact-proof scan
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function normalizeUrl(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  try {
    const url = new URL(withProtocol);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;
    return url.toString();
  } catch {
    return null;
  }
}
