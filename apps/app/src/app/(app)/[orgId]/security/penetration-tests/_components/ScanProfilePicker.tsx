import { RadioGroup, RadioGroupItem } from '@trycompai/design-system';
import type { ScanProfileId } from './scan-profiles';

interface ScanProfilePickerProps {
  activeProfile: ScanProfileId | null;
  headerLabel: string;
  runtimeEstimate: string;
  onChange: (value: ScanProfileId) => void;
}

const profileOptions: Array<{
  id: ScanProfileId;
  title: string;
  description: string;
}> = [
  {
    id: 'quick',
    title: 'Quick',
    description: 'Surface-level discovery and exposure checks.',
  },
  {
    id: 'standard',
    title: 'Standard',
    description: 'Balanced coverage with safe validation.',
  },
  {
    id: 'deep',
    title: 'Deep',
    description: 'Full coverage with impact validation.',
  },
];

export function ScanProfilePicker({
  activeProfile,
  headerLabel,
  runtimeEstimate,
  onChange,
}: ScanProfilePickerProps) {
  return (
    <div className="mb-5">
      <div className="mb-2 flex flex-col gap-1.5 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
        <div className="text-[11px] font-medium uppercase tracking-[0.1em] text-muted-foreground">
          Scan preset
        </div>
        <div className="font-mono text-[11px] text-foreground">
          {headerLabel} · {runtimeEstimate}
        </div>
      </div>
      <RadioGroup
        value={activeProfile ?? ''}
        onValueChange={(nextValue) => {
          if (isScanProfileId(nextValue)) {
            onChange(nextValue);
          }
        }}
        aria-label="Scan preset"
      >
        <div className="grid gap-2 sm:grid-cols-3">
          {profileOptions.map((profile) => (
            <label
              key={profile.id}
              htmlFor={`scan-preset-${profile.id}`}
              className="flex min-h-[96px] cursor-pointer select-none gap-2 rounded border border-border bg-background p-3 text-left transition-colors hover:bg-muted/50 has-[[data-checked]]:border-primary has-[[data-checked]]:bg-primary/5 has-[[data-checked]]:text-primary"
            >
              <RadioGroupItem id={`scan-preset-${profile.id}`} value={profile.id} />
              <span className="min-w-0">
                <span className="block text-sm font-medium">{profile.title}</span>
                <span className="mt-1 block text-xs leading-relaxed text-muted-foreground">
                  {profile.description}
                </span>
              </span>
            </label>
          ))}
        </div>
      </RadioGroup>
    </div>
  );
}

function isScanProfileId(value: unknown): value is ScanProfileId {
  return value === 'quick' || value === 'standard' || value === 'deep';
}
