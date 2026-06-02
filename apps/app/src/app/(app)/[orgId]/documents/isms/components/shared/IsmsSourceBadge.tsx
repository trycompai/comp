import { Badge, Text } from '@trycompai/design-system';
import { MachineLearningModel, UserData } from '@trycompai/design-system/icons';

export type IsmsRowSource = 'derived' | 'manual';

export interface IsmsSourceBadgeProps {
  /** Where the row came from: platform-derived vs. human-edited. */
  source: IsmsRowSource;
  /** Raw provenance key (e.g. "framework:ISO 27001", "vendors") — humanized for display. */
  derivedFrom?: string | null;
}

const PROVENANCE_LABELS: Record<string, string> = {
  vendors: 'Vendor register',
  subprocessors: 'Sub-processors',
  members: 'Workforce',
  devices: 'Devices',
  customers: 'Customers',
  risks: 'Risk register',
  training: 'Training records',
};

/** Turn a raw `derivedFrom` key into a friendly source label (never shows "framework:" etc.). */
function humanizeProvenance(derivedFrom?: string | null): string {
  if (!derivedFrom) return 'Auto-derived';
  if (derivedFrom.startsWith('framework:')) {
    const name = derivedFrom.slice('framework:'.length).trim();
    return name ? `${name} framework` : 'Frameworks';
  }
  if (derivedFrom.startsWith('wizard:')) return 'Setup wizard';
  const mapped = PROVENANCE_LABELS[derivedFrom];
  if (mapped) return mapped;
  const cleaned = derivedFrom.replace(/[:_-]+/g, ' ').trim();
  return cleaned ? cleaned.charAt(0).toUpperCase() + cleaned.slice(1) : 'Auto-derived';
}

/**
 * The shared provenance indicator for every ISMS register row. The common case —
 * platform-**derived** rows — renders as a quiet muted line with the humanized
 * source (e.g. "ISO 27001 framework", "Vendor register"), so default rows stay
 * calm. **Manual** rows (authored or overridden by a person) render as a small
 * badge so human intervention stands out. This is the ONE place this language
 * lives — never hand-roll it elsewhere.
 */
export function IsmsSourceBadge({ source, derivedFrom }: IsmsSourceBadgeProps) {
  if (source === 'manual') {
    return (
      <Badge variant="outline">
        <UserData size={10} />
        Manual
      </Badge>
    );
  }

  return (
    <div className="flex items-center gap-1.5 text-muted-foreground">
      <MachineLearningModel size={12} />
      <Text size="xs" variant="muted">
        {humanizeProvenance(derivedFrom)}
      </Text>
    </div>
  );
}
