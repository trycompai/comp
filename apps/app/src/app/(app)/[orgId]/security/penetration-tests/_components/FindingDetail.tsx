'use client';

import { Button } from '@trycompai/design-system';
import { cn } from '@trycompai/design-system/cn';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@trycompai/design-system';
import { ArrowLeft, Copy } from '@trycompai/design-system/icons';
import { toast } from 'sonner';
import type { PentestIssue } from '@/lib/security/penetration-tests-client';
import { SEVERITY_BG_VAR, SEVERITY_FG_VAR } from './severity';

interface FindingDetailProps {
  issue: PentestIssue;
  onBack: () => void;
}

const TABS = [
  { value: 'summary', label: 'Summary' },
  { value: 'poc', label: 'PoC' },
  { value: 'impact', label: 'Impact' },
  { value: 'remediation', label: 'Remediation' },
  { value: 'validation', label: 'Validation' },
  { value: 'attack', label: 'Attack path' },
  { value: 'evidence', label: 'Evidence' },
] as const;

export function FindingDetail({ issue, onBack }: FindingDetailProps) {
  const heroBg = SEVERITY_BG_VAR[issue.severity];
  const heroFg = SEVERITY_FG_VAR[issue.severity];

  return (
    <div className="min-h-0 overflow-y-auto">
      <div className="mx-auto max-w-5xl px-8 py-8 space-y-6">
        <div>
          <Button variant="ghost" size="sm" onClick={onBack}>
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to findings
          </Button>
        </div>

        {/* Severity-tinted hero */}
        <header
          className="rounded-[var(--radius)] border border-border p-6"
          style={{ backgroundColor: heroBg, color: heroFg }}
        >
          <div className="text-[10px] font-bold uppercase tracking-[0.08em] opacity-75">
            {issue.severity}
            {issue.cweId ? ` · ${issue.cweId}` : ''}
            {typeof issue.cvssScore === 'number' ? ` · CVSS ${issue.cvssScore}` : ''}
          </div>
          <h1 className="mt-2 text-[24px] font-medium leading-tight tracking-[-0.02em]">
            {issue.title}
          </h1>
          {issue.summary ? (
            <p className="mt-3 text-sm opacity-90">{issue.summary}</p>
          ) : null}
        </header>

        {/* KV strip */}
        <KVStrip issue={issue} />

        {/* Tabs */}
        <Tabs defaultValue="summary">
          <TabsList>
            {TABS.map((t) => (
              <TabsTrigger key={t.value} value={t.value}>
                {t.label}
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value="summary">
            <div className="mt-4">
              <Prose
                text={issue.description ?? issue.summary ?? 'No summary provided.'}
              />
            </div>
          </TabsContent>

          <TabsContent value="poc">
            <div className="mt-4">
              <CopyableBlock
                content={issue.proofOfConcept ?? 'No proof of concept recorded.'}
                empty={!issue.proofOfConcept}
              />
            </div>
          </TabsContent>

          <TabsContent value="impact">
            <div className="mt-4">
              <Prose text={issue.impact ?? 'No impact statement recorded.'} />
            </div>
          </TabsContent>

          <TabsContent value="remediation">
            <div className="mt-4">
              <Prose
                text={issue.remediation ?? 'No remediation guidance recorded.'}
              />
            </div>
          </TabsContent>

          <TabsContent value="validation">
            <div className="mt-4">
              <ValidationSection issue={issue} />
            </div>
          </TabsContent>

          <TabsContent value="attack">
            <p className="mt-4 text-sm text-muted-foreground">
              Attack-path analysis not surfaced in this view yet.
            </p>
          </TabsContent>

          <TabsContent value="evidence">
            <p className="mt-4 text-sm text-muted-foreground">
              Evidence (HTTP transcripts, screenshots, code snippets) coming soon.
            </p>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

function KVStrip({ issue }: { issue: PentestIssue }) {
  const cells = [
    { label: 'Status', value: issue.status },
    { label: 'Affected', value: issue.affectedEndpoint ?? '—' },
    {
      label: 'CVSS',
      value:
        typeof issue.cvssScore === 'number' ? issue.cvssScore.toFixed(1) : '—',
    },
    { label: 'CWE', value: issue.cweId ?? '—' },
  ];
  return (
    <div className="grid grid-cols-2 overflow-hidden rounded-[var(--radius)] border border-border md:grid-cols-4">
      {cells.map((cell, i) => (
        <div
          key={cell.label}
          className={cn(
            'flex flex-col gap-1 border-border px-4 py-3',
            i < cells.length - 1 && 'md:border-r',
            i < 2 && 'border-b md:border-b-0',
          )}
        >
          <span className="text-[10px] font-bold uppercase tracking-[0.08em] text-muted-foreground">
            {cell.label}
          </span>
          <span className="truncate font-mono text-xs">{cell.value}</span>
        </div>
      ))}
    </div>
  );
}

function Prose({ text }: { text: string }) {
  return (
    <div className="whitespace-pre-wrap text-sm leading-relaxed">{text}</div>
  );
}

function CopyableBlock({
  content,
  empty,
}: {
  content: string;
  empty: boolean;
}) {
  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(content);
      toast.success('Copied to clipboard');
    } catch {
      toast.error('Unable to copy');
    }
  };
  if (empty) {
    return (
      <p className="text-sm text-muted-foreground">{content}</p>
    );
  }
  return (
    <div className="relative">
      <div className="absolute right-2 top-2 z-10">
        <Button variant="outline" size="sm" onClick={() => void onCopy()}>
          <Copy className="h-3.5 w-3.5" />
          Copy
        </Button>
      </div>
      <pre className="overflow-x-auto rounded-[var(--radius)] border border-border bg-muted/50 p-4 pr-20 font-mono text-xs leading-relaxed">
        {content}
      </pre>
    </div>
  );
}

function ValidationSection({ issue }: { issue: PentestIssue }) {
  const steps = extractValidationSteps(issue);
  if (steps.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No validation steps recorded for this finding.
      </p>
    );
  }
  return (
    <ol className="space-y-3">
      {steps.map((step, i) => (
        <li
          key={i}
          className="flex items-start gap-3 rounded-[var(--radius)] border border-border bg-background p-3 text-sm"
        >
          <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-border bg-muted font-mono text-[10px]">
            {i + 1}
          </span>
          <span className="flex-1">{step}</span>
        </li>
      ))}
    </ol>
  );
}

// Validation-steps field isn't part of PentestIssue type (yet); parse if it
// shows up on future payloads. For now returns empty.
function extractValidationSteps(_issue: PentestIssue): string[] {
  return [];
}
