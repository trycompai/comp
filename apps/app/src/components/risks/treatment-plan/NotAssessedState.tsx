'use client';

import { Button, Card, CardContent, Stack, Text } from '@trycompai/design-system';
import { Information } from '@trycompai/design-system/icons';

interface NotAssessedStateProps {
  onAssess: () => Promise<void> | void;
  disabled?: boolean;
}

export function NotAssessedState({ onAssess, disabled }: NotAssessedStateProps) {
  return (
    <Card>
      <CardContent>
        <Stack gap="sm" align="center">
          <Information size={20} aria-hidden="true" className="text-muted-foreground" />
          <Text size="sm" weight="medium">
            No risk assessment yet
          </Text>
          <div className="max-w-md text-center">
            <Text size="xs" variant="muted">
              Run the AI risk assessment to enable a suggested residual based on the vendor&apos;s
              data handling, exposure, and compliance posture.
            </Text>
          </div>
          <div>
            <Button size="sm" onClick={() => void onAssess()} disabled={disabled}>
              Run risk assessment
            </Button>
          </div>
        </Stack>
      </CardContent>
    </Card>
  );
}
