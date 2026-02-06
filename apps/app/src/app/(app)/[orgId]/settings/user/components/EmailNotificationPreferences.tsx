'use client';

import { useApi } from '@/hooks/use-api';
import {
  Button,
  Checkbox,
  HStack,
  Section,
  Stack,
  Text,
} from '@trycompai/design-system';
import { Lock } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';

interface EmailPreferences {
  policyNotifications: boolean;
  taskReminders: boolean;
  weeklyTaskDigest: boolean;
  unassignedItemsNotifications: boolean;
  taskMentions: boolean;
  taskAssignments: boolean;
}

interface RoleNotifications {
  policyNotifications: boolean;
  taskReminders: boolean;
  taskAssignments: boolean;
  taskMentions: boolean;
  weeklyTaskDigest: boolean;
  findingNotifications: boolean;
}

interface Props {
  initialPreferences: EmailPreferences;
  email: string;
  isAdminOrOwner?: boolean;
  roleNotifications?: RoleNotifications | null;
}

const NOTIFICATION_ITEMS: {
  key: keyof EmailPreferences;
  roleKey?: keyof RoleNotifications;
  label: string;
  description: string;
}[] = [
  {
    key: 'policyNotifications',
    roleKey: 'policyNotifications',
    label: 'Policy Notifications',
    description:
      'Receive emails when new policies are published or existing policies are updated',
  },
  {
    key: 'taskReminders',
    roleKey: 'taskReminders',
    label: 'Task Reminders',
    description: 'Receive reminders when tasks are due soon or overdue',
  },
  {
    key: 'weeklyTaskDigest',
    roleKey: 'weeklyTaskDigest',
    label: 'Weekly Task Digest',
    description: 'Receive a weekly summary of pending tasks',
  },
  {
    key: 'unassignedItemsNotifications',
    label: 'Unassigned Items Notifications',
    description:
      'Receive notifications when items need reassignment after a member is removed',
  },
  {
    key: 'taskMentions',
    roleKey: 'taskMentions',
    label: 'Task Mentions',
    description: 'Receive notifications when someone mentions you in a task',
  },
  {
    key: 'taskAssignments',
    roleKey: 'taskAssignments',
    label: 'Task Assignments',
    description: 'Receive notifications when someone assigns a task to you',
  },
];

export function EmailNotificationPreferences({
  initialPreferences,
  email,
  isAdminOrOwner = true,
  roleNotifications,
}: Props) {
  const api = useApi();
  const router = useRouter();
  const [preferences, setPreferences] =
    useState<EmailPreferences>(initialPreferences);
  const [saving, setSaving] = useState(false);

  const handleToggle = (key: keyof EmailPreferences, checked: boolean) => {
    setPreferences((prev) => ({
      ...prev,
      [key]: checked,
    }));
  };

  const handleSelectAll = () => {
    const allEnabled = Object.values(preferences).every((v) => v === true);
    setPreferences({
      policyNotifications: !allEnabled,
      taskReminders: !allEnabled,
      weeklyTaskDigest: !allEnabled,
      unassignedItemsNotifications: !allEnabled,
      taskMentions: !allEnabled,
      taskAssignments: !allEnabled,
    });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const response = await api.put('/v1/people/me/email-preferences', { preferences });
      if (response.error) throw new Error(response.error);
      toast.success('Email preferences updated successfully');
      router.refresh();
    } catch {
      toast.error('Failed to update preferences');
    } finally {
      setSaving(false);
    }
  };

  // Check if a notification is locked by role settings (non-admin users only)
  const isLocked = (item: (typeof NOTIFICATION_ITEMS)[number]): boolean => {
    if (isAdminOrOwner) return false;
    if (!roleNotifications || !item.roleKey) return false;
    return true; // Non-admin users can't change role-controlled notifications
  };

  // Get effective checked state considering role settings
  const isChecked = (item: (typeof NOTIFICATION_ITEMS)[number]): boolean => {
    if (!isAdminOrOwner && roleNotifications && item.roleKey) {
      return roleNotifications[item.roleKey];
    }
    return preferences[item.key];
  };

  const description = isAdminOrOwner
    ? `Manage which email notifications you receive at ${email}.`
    : `Email notification settings for ${email}. Most settings are managed by your organization admin.`;

  return (
    <Section
      title="Email Notifications"
      description={description}
      actions={
        isAdminOrOwner ? (
          <Button onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : 'Save'}
          </Button>
        ) : undefined
      }
    >
      <Stack>
        {isAdminOrOwner && (
          <HStack align="center" justify="between">
            <div>
              <Text size="base" weight="medium">
                Enable All
              </Text>
              <Text size="sm" variant="muted">
                Toggle all notifications
              </Text>
            </div>
            <Button onClick={handleSelectAll} variant="outline" size="sm">
              {Object.values(preferences).every((v) => v === true)
                ? 'Disable All'
                : 'Enable All'}
            </Button>
          </HStack>
        )}

        <Stack>
          {NOTIFICATION_ITEMS.map((item) => {
            const locked = isLocked(item);
            const checked = isChecked(item);

            return (
              <label
                key={item.key}
                className={`flex items-start gap-4 rounded-lg border p-4 transition-colors ${
                  locked
                    ? 'opacity-60 cursor-default'
                    : 'cursor-pointer hover:bg-muted/50'
                }`}
              >
                <Checkbox
                  checked={checked}
                  onCheckedChange={
                    locked
                      ? undefined
                      : (c) => handleToggle(item.key, c === true)
                  }
                  disabled={locked}
                />
                <div className="flex-1 min-w-0">
                  <HStack align="center" gap="xs">
                    <Text weight="medium">{item.label}</Text>
                    {locked && (
                      <Lock className="h-3.5 w-3.5 text-muted-foreground" />
                    )}
                  </HStack>
                  <Text size="sm" variant="muted">
                    {item.description}
                  </Text>
                  {locked && (
                    <Text size="xs" variant="muted">
                      Managed by your organization admin
                    </Text>
                  )}
                </div>
              </label>
            );
          })}
        </Stack>

        <Text size="xs" variant="muted">
          {isAdminOrOwner
            ? 'You can also manage these preferences by clicking the unsubscribe link in any email notification.'
            : 'Contact your admin to change locked notification settings.'}
        </Text>
      </Stack>
    </Section>
  );
}
