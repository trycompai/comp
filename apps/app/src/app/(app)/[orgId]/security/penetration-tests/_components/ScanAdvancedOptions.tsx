import type { EvidenceLevel, PentestCheck } from '@/lib/security/penetration-tests-client';
import { Checkbox, RadioGroup, RadioGroupItem } from '@trycompai/design-system';
import { allPentestChecks, checkLabels, evidenceLabels } from './scan-profiles';

interface ScanAdvancedOptionsProps {
  open: boolean;
  evidenceLevel: EvidenceLevel;
  checks: PentestCheck[];
  onOpenChange: (open: boolean) => void;
  onEvidenceLevelChange: (value: EvidenceLevel) => void;
  onChecksChange: (checks: PentestCheck[]) => void;
}

const evidenceOptions: EvidenceLevel[] = ['report_only', 'safe_proof', 'impact_proof'];

const evidenceHelperText: Record<EvidenceLevel, string> = {
  report_only: 'Fastest and lowest risk. Some findings may need manual confirmation.',
  safe_proof: 'Balanced validation. Good default for production or staging targets.',
  impact_proof:
    'Highest confidence, longer runtime, and stronger target interaction. Requires authorization.',
};

export function ScanAdvancedOptions({
  open,
  evidenceLevel,
  checks,
  onOpenChange,
  onEvidenceLevelChange,
  onChecksChange,
}: ScanAdvancedOptionsProps) {
  const hasDiscoveryDependentChecks = checks.some((check) => check !== 'discovery');

  const handleToggleCheck = (check: PentestCheck, checked: boolean) => {
    if (check === 'discovery' && hasDiscoveryDependentChecks) return;

    const nextChecks = checked
      ? [...checks, check]
      : checks.filter((selectedCheck) => selectedCheck !== check);

    onChecksChange(nextChecks);
  };

  return (
    <div className="mb-5 rounded border border-border bg-muted/30">
      <button
        type="button"
        onClick={() => onOpenChange(!open)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-3 px-3.5 py-3 text-left"
      >
        <span>
          <span className="block text-[11px] font-medium uppercase tracking-[0.1em] text-muted-foreground">
            Customize scan
          </span>
          <span className="mt-1 block text-xs text-muted-foreground">
            Evidence level and individual checks
          </span>
        </span>
        <span className="font-mono text-[11px] text-muted-foreground">
          {open ? 'Hide' : 'Show'}
        </span>
      </button>

      {open && (
        <div className="border-t border-border px-3.5 py-3">
          <fieldset className="mb-4">
            <legend className="mb-2 text-[11px] font-medium uppercase tracking-[0.1em] text-muted-foreground">
              Validation level
            </legend>
            <RadioGroup
              value={evidenceLevel}
              onValueChange={(nextValue) => {
                if (isEvidenceLevel(nextValue)) {
                  onEvidenceLevelChange(nextValue);
                }
              }}
              aria-label="Validation level"
            >
              <div className="grid gap-2 sm:grid-cols-3">
                {evidenceOptions.map((option) => (
                  <label
                    key={option}
                    htmlFor={`evidence-${option}`}
                    className="flex min-h-11 cursor-pointer items-center gap-2 rounded border border-border bg-background p-2.5 text-xs has-[[data-checked]]:border-primary has-[[data-checked]]:bg-primary/5 has-[[data-checked]]:text-primary"
                  >
                    <RadioGroupItem id={`evidence-${option}`} value={option} />
                    <span className="min-w-0 font-medium">{evidenceLabels[option]}</span>
                  </label>
                ))}
              </div>
            </RadioGroup>
            <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">
              {evidenceHelperText[evidenceLevel]}
            </p>
          </fieldset>

          <fieldset>
            <legend className="mb-2 text-[11px] font-medium uppercase tracking-[0.1em] text-muted-foreground">
              Checks
            </legend>
            <div className="grid gap-2 sm:grid-cols-2">
              {allPentestChecks.map((check) => {
                const checked = checks.includes(check);
                const disabled = check === 'discovery' && hasDiscoveryDependentChecks;

                return (
                  <label
                    key={check}
                    className="flex min-h-9 items-center gap-2 rounded border border-border bg-background px-2.5 py-2 text-xs"
                  >
                    <Checkbox
                      checked={checked}
                      disabled={disabled}
                      onCheckedChange={(nextChecked) =>
                        handleToggleCheck(check, nextChecked === true)
                      }
                    />
                    <span>{checkLabels[check]}</span>
                  </label>
                );
              })}
            </div>
          </fieldset>
        </div>
      )}
    </div>
  );
}

function isEvidenceLevel(value: unknown): value is EvidenceLevel {
  return value === 'report_only' || value === 'safe_proof' || value === 'impact_proof';
}
