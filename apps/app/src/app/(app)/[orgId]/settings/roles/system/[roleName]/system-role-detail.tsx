'use client';

import { Card, CardContent } from '@comp/ui/card';
import { Stack, Text } from '@trycompai/design-system';
import { PermissionMatrix } from '../../components/PermissionMatrix';

interface SystemRoleDetailProps {
  permissions: Record<string, string[]>;
  description: string;
}

export function SystemRoleDetail({ permissions, description }: SystemRoleDetailProps) {
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
            disabled
          />
        </Stack>
      </CardContent>
    </Card>
  );
}
