'use client';

import { ExternalLink, Wrench } from 'lucide-react';

import { parseRemediation } from './remediation-parser';

interface RemediationSectionProps {
  remediation: string;
}

/**
 * Renders a finding's remediation guidance as structured pieces:
 *   - the actual fix steps as readable text
 *   - an optional "Reference" link to the provider's documentation
 *   - compliance framework chips
 *
 * For GCP findings the API concatenates these into a single string;
 * `parseRemediation` splits them back apart. AWS / Azure remediations
 * render as plain step text with no metadata chips.
 */
export function RemediationSection({ remediation }: RemediationSectionProps) {
  const parsed = parseRemediation(remediation);
  if (!parsed.steps && !parsed.referenceUrl && parsed.compliance.length === 0) {
    return null;
  }

  return (
    <div className="rounded-md border border-primary/15 bg-primary/[0.02]">
      <div className="flex items-center gap-1.5 border-b border-primary/10 px-3 py-2">
        <Wrench className="h-3 w-3 text-primary/70" />
        <h4 className="text-xs font-medium">Remediation</h4>
      </div>
      <div className="space-y-2.5 px-3 py-3 text-xs">
        {parsed.steps && (
          <p className="text-foreground/80 leading-relaxed whitespace-pre-line">
            {parsed.steps}
          </p>
        )}
        {parsed.referenceUrl && (
          <a
            href={parsed.referenceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-primary hover:underline"
          >
            <ExternalLink className="h-3 w-3" />
            Reference documentation
          </a>
        )}
        {parsed.compliance.length > 0 && (
          <div>
            <p className="mb-1 text-[10px] uppercase tracking-wide text-muted-foreground">
              Compliance
            </p>
            <div className="flex flex-wrap gap-1">
              {parsed.compliance.map((framework, idx) => (
                <ComplianceChip key={`${framework.standard}-${idx}`} framework={framework} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function ComplianceChip({
  framework,
}: {
  framework: {
    standard: string;
    version: string | null;
    ids: string[];
  };
}) {
  const label = framework.version
    ? `${framework.standard.toUpperCase()} ${framework.version}`
    : framework.standard.toUpperCase();
  const detail = framework.ids.join(', ');

  return (
    <span
      className="inline-flex items-center gap-1 rounded border bg-background px-1.5 py-0.5 text-[10px]"
      title={detail || undefined}
    >
      <span className="font-medium text-foreground/80">{label}</span>
      {detail && <span className="text-muted-foreground">{detail}</span>}
    </span>
  );
}
