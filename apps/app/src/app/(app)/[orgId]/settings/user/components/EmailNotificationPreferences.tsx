'use client';

import { Button } from '@comp/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@comp/ui/card';
import { Checkbox } from '@comp/ui/checkbox';
import { useAction } from 'next-safe-action/hooks';
import { useState } from 'react';
import { toast } from 'sonner';
import { updateEmailPreferencesAction } from '../actions/update-email-preferences';

interface EmailPreferences {
  policyNotifications: boolean;
  taskReminders: boolean;
  weeklyTaskDigest: boolean;
  unassignedItemsNotifications: boolean;
}

interface Props {
  initialPreferences: EmailPreferences;
  email: string;
}

export function EmailNotificationPreferences({ initialPreferences, email }: Props) {
  // Normal logic: true = subscribed (checked), false = unsubscribed (unchecked)
  const [preferences, setPreferences] = useState<EmailPreferences>(initialPreferences);
  const [saving, setSaving] = useState(false);

  const { execute } = useAction(updateEmailPreferencesAction, {
    onSuccess: () => {
      toast.success('Email preferences updated successfully');
      setSaving(false);
    },
    onError: ({ error }) => {
      toast.error(error.serverError || 'Failed to update preferences');
      setSaving(false);
    },
  });

  const handleToggle = (key: keyof EmailPreferences, checked: boolean) => {
    setPreferences((prev) => ({
      ...prev,
      [key]: checked,
    }));
  };

  const handleSelectAll = () => {
    // If all are enabled (all true), disable all (set all to false)
    // If any are disabled (some false), enable all (set all to true)
    const allEnabled = Object.values(preferences).every((v) => v === true);
    setPreferences({
      policyNotifications: !allEnabled,
      taskReminders: !allEnabled,
      weeklyTaskDigest: !allEnabled,
      unassignedItemsNotifications: !allEnabled,
    });
  };

  const handleSave = async () => {
    setSaving(true);
    execute({ preferences });
  };

  // Check if all are disabled (all false)
  const allDisabled = Object.values(preferences).every((v) => v === false);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Email Notifications</CardTitle>
        <CardDescription>
          Manage which email notifications you receive at{' '}
          <span className="font-medium">{email}</span>. These preferences apply to all organizations
          you're a member of.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between border-b pb-4">
          <div>
            <label className="text-base font-medium text-foreground">Enable All</label>
            <p className="text-sm text-muted-foreground">Toggle all notifications</p>
          </div>
          <Button onClick={handleSelectAll} variant="outline" size="sm">
            {Object.values(preferences).every((v) => v === true) ? 'Disable All' : 'Enable All'}
          </Button>
        </div>

        <div className="space-y-4">
          <label className="flex cursor-pointer items-start gap-4 rounded-lg border p-4 hover:bg-muted/50 transition-colors">
            <Checkbox
              checked={preferences.policyNotifications}
              onCheckedChange={(checked) => handleToggle('policyNotifications', checked === true)}
              className="mt-1 shrink-0"
            />
            <div className="flex-1 min-w-0">
              <div className="font-medium text-foreground">Policy Notifications</div>
              <div className="text-sm text-muted-foreground">
                Receive emails when new policies are published or existing policies are updated
              </div>
            </div>
          </label>

          <label className="flex cursor-pointer items-start gap-4 rounded-lg border p-4 hover:bg-muted/50 transition-colors">
            <Checkbox
              checked={preferences.taskReminders}
              onCheckedChange={(checked) => handleToggle('taskReminders', checked === true)}
              className="mt-1 shrink-0"
            />
            <div className="flex-1 min-w-0">
              <div className="font-medium text-foreground">Task Reminders</div>
              <div className="text-sm text-muted-foreground">
                Receive reminders when tasks are due soon or overdue
              </div>
            </div>
          </label>

          <label className="flex cursor-pointer items-start gap-4 rounded-lg border p-4 hover:bg-muted/50 transition-colors">
            <Checkbox
              checked={preferences.weeklyTaskDigest}
              onCheckedChange={(checked) => handleToggle('weeklyTaskDigest', checked === true)}
              className="mt-1 shrink-0"
            />
            <div className="flex-1 min-w-0">
              <div className="font-medium text-foreground">Weekly Task Digest</div>
              <div className="text-sm text-muted-foreground">
                Receive a weekly summary of pending tasks
              </div>
            </div>
          </label>

          <label className="flex cursor-pointer items-start gap-4 rounded-lg border p-4 hover:bg-muted/50 transition-colors">
            <Checkbox
              checked={preferences.unassignedItemsNotifications}
              onCheckedChange={(checked) =>
                handleToggle('unassignedItemsNotifications', checked === true)
              }
              className="mt-1 shrink-0"
            />
            <div className="flex-1 min-w-0">
              <div className="font-medium text-foreground">Unassigned Items Notifications</div>
              <div className="text-sm text-muted-foreground">
                Receive notifications when items need reassignment after a member is removed
              </div>
            </div>
          </label>
        </div>
      </CardContent>
      <CardFooter className="flex justify-between">
        <div className="text-muted-foreground text-xs">
          You can also manage these preferences by clicking the unsubscribe link in any email
          notification.
        </div>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? 'Saving...' : 'Save'}
        </Button>
      </CardFooter>
    </Card>
  );
}
