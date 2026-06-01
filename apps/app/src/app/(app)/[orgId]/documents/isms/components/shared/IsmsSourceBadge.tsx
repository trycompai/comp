import { Badge, Stack, Text } from '@trycompai/design-system';
import { MachineLearningModel, UserData } from '@trycompai/design-system/icons';

export type IsmsRowSource = 'derived' | 'manual';

export interface IsmsSourceBadgeProps {
  /** Where the row came from: platform-derived vs. human-edited. */
  source: IsmsRowSource;
  /** Optional provenance string (e.g. "framework:ISO 27001"); shown muted below. */
  derivedFrom?: string | null;
}

/**
 * The shared provenance badge for every ISMS register row. "Auto-derived" rows
 * are generated from platform data; "Manual" rows were authored or overridden by
 * a person (correct for both authored-new and overridden-derived rows). This is
 * the ONE place this derived-vs-manual language lives — never hand-roll a
 * coloured span for it.
 */
export function IsmsSourceBadge({ source, derivedFrom }: IsmsSourceBadgeProps) {
  const isDerived = source === 'derived';
  return (
    <Stack gap="1">
      <Badge variant={isDerived ? 'secondary' : 'outline'}>
        {isDerived ? <MachineLearningModel size={10} /> : <UserData size={10} />}
        {isDerived ? 'Auto-derived' : 'Manual'}
      </Badge>
      {derivedFrom && (
        <Text size="xs" variant="muted">
          {derivedFrom}
        </Text>
      )}
    </Stack>
  );
}
