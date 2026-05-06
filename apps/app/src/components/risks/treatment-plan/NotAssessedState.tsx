'use client';

import { Button, Card, CardContent, Stack, Text } from '@trycompai/design-system';
import { Information } from '@trycompai/design-system/icons';

interface NotAssessedStateProps {
  onAssess: () => Promise<void> | void;
  disabled?: boolean;
  /**
   * Override the empty-state body. Default copy is intentionally neutral
   * ("the entity's...") so the component is safe to reuse on both the
   * vendor and risk surfaces. Callers should supply subject-specific
   * copy when context allows it. (Cubic finding on PR #2671 — the prior
   * default leaked vendor-only language onto the risk page if reused.)
   */
  description?: string;
  /** Override the headline. Defaults to "No risk assessment yet". */
  headline?: string;
  /** Override the CTA label. Defaults to "Run risk assessment". */
  ctaLabel?: string;
}

export function NotAssessedState({
  onAssess,
  disabled,
  description = "Run the AI risk assessment to enable a suggested residual based on the entity's data handling, exposure, and compliance posture.",
  headline = 'No risk assessment yet',
  ctaLabel = 'Run risk assessment',
}: NotAssessedStateProps) {
  return (
    <Card>
      <CardContent>
        <Stack gap="sm" align="center">
          <Information size={20} aria-hidden="true" className="text-muted-foreground" />
          <Text size="sm" weight="medium">
            {headline}
          </Text>
          <div className="max-w-md text-center">
            <Text size="xs" variant="muted">
              {description}
            </Text>
          </div>
          <div>
            <Button size="sm" onClick={() => void onAssess()} disabled={disabled}>
              {ctaLabel}
            </Button>
          </div>
        </Stack>
      </CardContent>
    </Card>
  );
}
