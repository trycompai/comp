'use client';

import { Card, CardContent } from '@comp/ui/card';
import { Stack, Text } from '@trycompai/design-system';
import { PermissionMatrix } from '../../components/PermissionMatrix';

interface SystemRoleDetailProps {
  permissions: Record<string, string[]>;
  obligations: Record<string, boolean>;
  description: string;
}

export function SystemRoleDetail({ permissions, obligations, description }: SystemRoleDetailProps) {
  return (
    <Card>
      <CardContent className="pt-6">
        <Stack gap="md">
          <Text size="sm" variant="muted">
            {description}
          </Text>
          <PermissionMatrix
            value={permissions}
            onChange={() => {}}
            obligations={obligations}
            onObligationsChange={() => {}}
            disabled
          />
        </Stack>
      </CardContent>
    </Card>
  );
}
