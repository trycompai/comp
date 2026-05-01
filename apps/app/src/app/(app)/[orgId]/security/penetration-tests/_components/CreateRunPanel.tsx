'use client';

import type { PentestCreateRequest } from '@/lib/security/penetration-tests-client';
import { Button } from '@trycompai/design-system';
import { ArrowRight, Link } from '@trycompai/design-system/icons';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';

interface CreateRunPanelProps {
  orgId: string;
  onSubmit: (payload: PentestCreateRequest) => Promise<{ id: string }>;
  isSubmitting?: boolean;
  /** Subscription allowance balance — disables submit when 0. */
  balance?: number;
  planRequired?: boolean;
  quotaLabel?: 'Plan';
}

/**
 * Inline right-pane form that replaces the old modal Dialog. Matches the
 * design-handoff layout: centered card with header label, target + repo
 * inputs, scope-summary box, and Cancel / Start-scan actions.
 */
export function CreateRunPanel({
  orgId,
  onSubmit,
  isSubmitting,
  balance,
  planRequired,
  quotaLabel = 'Plan',
}: CreateRunPanelProps) {
  const router = useRouter();
  const [targetUrl, setTargetUrl] = useState('');
  const [repoUrl, setRepoUrl] = useState('');
  const canCreate = balance === undefined ? true : balance > 0;

  const handleCancel = () => {
    router.push(`/${orgId}/security/penetration-tests`);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canCreate) {
      toast.error(
        planRequired
          ? 'Start a plan or free trial to run penetration tests.'
          : 'No pentest runs remaining. Choose a plan to continue.',
      );
      router.push(`/${orgId}/settings/billing/add-ons/penetration-tests`);
      return;
    }
    const normalized = normalizeUrl(targetUrl);
    if (!normalized) {
      toast.error('Target URL is required.');
      return;
    }
    try {
      const result = await onSubmit({
        targetUrl: normalized,
        ...(repoUrl.trim() ? { repoUrl: repoUrl.trim() } : {}),
      });
      router.push(`/${orgId}/security/penetration-tests/${encodeURIComponent(result.id)}`);
    } catch {
      // onSubmit handles its own toast.
    }
  };

  return (
    <div className="min-h-0 overflow-y-auto">
      <div className="mx-auto w-full max-w-[680px] px-6 py-10">
        <form
          noValidate
          onSubmit={(e) => void handleSubmit(e)}
          className="rounded-[var(--radius)] border border-border bg-card p-8 shadow-[0_24px_48px_-12px_rgba(0,0,0,0.12)]"
        >
          <div className="mb-1.5 text-[10px] font-bold uppercase tracking-[0.1em] text-muted-foreground">
            New scan
          </div>
          <div className="mb-1 text-[20px] font-normal tracking-[-0.01em]">
            Start a penetration test
          </div>
          <p className="mb-5 text-xs leading-relaxed text-muted-foreground">
            Scans typically take 1–3 hours. Findings stream in as they're discovered — you don't
            need to keep this page open.
          </p>

          {!canCreate && (
            <div className="mb-5 rounded border border-destructive/40 bg-destructive/5 p-3.5 text-xs leading-relaxed text-destructive">
              {planRequired
                ? 'Start a plan or free trial to run penetration tests.'
                : 'No pentest runs remaining. Choose a plan to continue.'}
            </div>
          )}

          <div className="mb-4">
            <label
              htmlFor="pt-target-url"
              className="mb-1.5 block text-[11px] font-medium uppercase tracking-[0.1em] text-muted-foreground"
            >
              Target URL
            </label>
            <div className="flex h-9 items-center gap-1.5 rounded border border-border bg-background px-3">
              <span className="font-mono text-xs text-muted-foreground">https://</span>
              <input
                id="pt-target-url"
                value={targetUrl}
                onChange={(e) => setTargetUrl(e.target.value)}
                placeholder="your.staging.app"
                autoFocus
                required
                className="flex-1 bg-transparent font-mono text-xs outline-none"
              />
            </div>
            <p className="mt-1 text-[11px] text-muted-foreground">
              Must be reachable from the scanner — localhost and private IPs are rejected.
            </p>
          </div>

          <div className="mb-5">
            <div className="mb-1.5 flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-[0.1em] text-muted-foreground">
              <span>Repository</span>
              <span className="font-normal normal-case tracking-normal text-muted-foreground">
                (optional)
              </span>
            </div>
            <div className="flex h-9 items-center gap-1.5 rounded border border-border bg-background px-3">
              <Link className="h-3 w-3 text-muted-foreground" />
              <input
                value={repoUrl}
                onChange={(e) => setRepoUrl(e.target.value)}
                placeholder="github.com/acme/platform"
                className="flex-1 bg-transparent font-mono text-xs outline-none"
              />
            </div>
            <p className="mt-1 text-[11px] text-muted-foreground">
              Public repositories only. We use source context to write better remediation steps.
            </p>
          </div>

          <div className="mb-5 rounded border border-border bg-muted/50 p-3.5">
            <div className="mb-2 text-[11px] font-medium uppercase tracking-[0.1em] text-muted-foreground">
              What to expect
            </div>
            <dl className="space-y-1 text-xs leading-loose">
              {[
                ['Typical duration', '1–3 hours'],
                ['Output', 'Findings + markdown & PDF report'],
                ['Mode', 'Read-only — never modifies your target'],
              ].map(([label, value]) => (
                <div key={label} className="flex items-center justify-between">
                  <dt className="text-muted-foreground">{label}</dt>
                  <dd className="font-mono text-right">{value}</dd>
                </div>
              ))}
            </dl>
            <p className="mt-2 text-[11px] text-muted-foreground">
              Findings stream into this page as they're discovered — you can close this tab and come
              back.
            </p>
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={handleCancel} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" loading={isSubmitting} disabled={isSubmitting}>
              {canCreate ? `Start scan (${quotaLabel})` : 'Choose plan'}
              <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </form>
      </div>
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
