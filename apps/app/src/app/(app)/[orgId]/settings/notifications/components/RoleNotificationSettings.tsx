'use client';

import {
  Button,
  Checkbox,
  HStack,
  Section,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Text,
} from '@trycompai/design-system';
import { useAction } from 'next-safe-action/hooks';
import { useState } from 'react';
import { toast } from 'sonner';
import { updateRoleNotificationsAction } from '../actions/updateRoleNotifications';
import type { NotificationKey, RoleNotificationConfig } from '../data/getRoleNotificationSettings';
import { NOTIFICATION_TYPES } from '../data/getRoleNotificationSettings';

interface Props {
  initialSettings: RoleNotificationConfig[];
}

export function RoleNotificationSettings({ initialSettings }: Props) {
  const [settings, setSettings] = useState<RoleNotificationConfig[]>(initialSettings);
  const [saving, setSaving] = useState(false);

  const { execute } = useAction(updateRoleNotificationsAction, {
    onSuccess: () => {
      toast.success('Notification settings updated');
      setSaving(false);
    },
    onError: ({ error }) => {
      toast.error(error.serverError || 'Failed to update settings');
      setSaving(false);
    },
  });

  const handleToggle = (roleIndex: number, key: NotificationKey, checked: boolean) => {
    setSettings((prev) =>
      prev.map((config, i) =>
        i === roleIndex
          ? {
              ...config,
              notifications: { ...config.notifications, [key]: checked },
            }
          : config,
      ),
    );
  };

  const hasChanges = JSON.stringify(settings) !== JSON.stringify(initialSettings);

  const handleSave = () => {
    setSaving(true);
    execute({
      settings: settings.map((config) => ({
        role: config.role,
        ...config.notifications,
      })),
    });
  };

  return (
    <Section
      title="Role Notification Settings"
      description="Configure which email notifications each role receives. Users with owner or admin roles can individually opt out. All other roles follow these settings."
      actions={
        <Button size="lg" onClick={handleSave} disabled={saving || !hasChanges} loading={saving}>
          Save Changes
        </Button>
      }
    >
      <Table variant="bordered">
        <TableHeader>
          <TableRow>
            <TableHead>Role</TableHead>
            {NOTIFICATION_TYPES.map((type) => (
              <TableHead key={type.key} title={type.description}>
                <div className="text-center">{type.label}</div>
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {settings.map((config, roleIndex) => (
            <TableRow key={config.role}>
              <TableCell>
                <Text size="sm" weight="medium">
                  {config.label}
                </Text>
                {config.isCustom && (
                  <Text size="xs" variant="muted">
                    Custom role
                  </Text>
                )}
              </TableCell>
              {NOTIFICATION_TYPES.map((type) => (
                <TableCell key={type.key}>
                  <HStack justify="center">
                    <Checkbox
                      checked={config.notifications[type.key]}
                      onCheckedChange={(checked) =>
                        handleToggle(roleIndex, type.key, checked === true)
                      }
                    />
                  </HStack>
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Section>
  );
}
