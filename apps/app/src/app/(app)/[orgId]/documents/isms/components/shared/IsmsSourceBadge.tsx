import { Badge } from '@trycompai/design-system';

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
    return name || 'Framework';
  }
  // Requirement rows are derived per interested party; the suffix is the party
  // name, shown verbatim (never the raw record id).
  if (derivedFrom.startsWith('party:')) {
    const name = derivedFrom.slice('party:'.length).trim();
    return name || 'Interested party';
  }
  if (derivedFrom.startsWith('wizard:')) return 'Setup wizard';
  const mapped = PROVENANCE_LABELS[derivedFrom];
  if (mapped) return mapped;
  const cleaned = derivedFrom.replace(/[:_-]+/g, ' ').trim();
  return cleaned ? cleaned.charAt(0).toUpperCase() + cleaned.slice(1) : 'Auto-derived';
}

/**
 * The shared provenance pill for an ISMS register entry. Derived rows show their
 * humanized source ("ISO 27001 framework", "Vendor register"); manual rows show
 * "Manual". Rendered as a plain tag-style pill (no icon) meant to sit beneath the
 * entry's description. This is the ONE place this language lives.
 */
export function IsmsSourceBadge({ source, derivedFrom }: IsmsSourceBadgeProps) {
  const label = source === 'manual' ? 'Manual' : humanizeProvenance(derivedFrom);
  return <Badge variant="secondary">{label}</Badge>;
}
