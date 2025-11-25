'use client';

import { Checkbox } from '@comp/ui/checkbox';
import { Button } from '@comp/ui/button';
import { useState } from 'react';
import { updateEmailPreferencesAction } from '../actions/update-email-preferences';
import { useAction } from 'next-safe-action/hooks';
import { toast } from 'sonner';

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

  const allDisabled = Object.values(preferences).every((v) => v === false);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Email Notification Preferences</h2>
        <p className="text-sm text-muted-foreground">
          Manage which email notifications you receive at <span className="font-medium">{email}</span>. These preferences apply to all organizations you're a member of.
        </p>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between border-b pb-4">
          <div>
            <label className="text-base font-medium text-foreground">Enable All</label>
            <p className="text-sm text-muted-foreground">Toggle all notifications at once</p>
          </div>
          <Button
            onClick={handleSelectAll}
            variant="outline"
            size="sm"
          >
            {Object.values(preferences).every((v) => v === true) ? 'Disable All' : 'Enable All'}
          </Button>
        </div>

        <div className="space-y-4">
          <label className="flex cursor-pointer items-start gap-4 rounded-lg border p-4 hover:bg-muted/50 transition-colors">
            <Checkbox
              checked={preferences.policyNotifications}
              onCheckedChange={(checked) => handleToggle('policyNotifications', checked === true)}
              className="mt-1 flex-shrink-0"
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
              className="mt-1 flex-shrink-0"
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
              className="mt-1 flex-shrink-0"
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
              onCheckedChange={(checked) => handleToggle('unassignedItemsNotifications', checked === true)}
              className="mt-1 flex-shrink-0"
            />
            <div className="flex-1 min-w-0">
              <div className="font-medium text-foreground">Unassigned Items Notifications</div>
              <div className="text-sm text-muted-foreground">
                Receive notifications when items need reassignment after a member is removed
              </div>
            </div>
          </label>
        </div>
      </div>

      {allDisabled && (
        <div className="rounded-md bg-yellow-500/10 border border-yellow-500/20 p-4 text-sm text-yellow-700 dark:text-yellow-400">
          You have disabled all notifications. You won't receive any email notifications from any organization.
        </div>
      )}

      <div className="flex justify-end">
        <Button
          onClick={handleSave}
          disabled={saving}
        >
          {saving ? 'Saving...' : 'Save Preferences'}
        </Button>
      </div>

      <div className="rounded-md bg-muted p-4 text-sm text-muted-foreground">
        <p className="font-medium mb-1">Note:</p>
        <p>You can also manage these preferences by clicking the unsubscribe link in any email notification.</p>
      </div>
    </div>
  );
}

