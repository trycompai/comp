'use client';

import { Button } from '@comp/ui/button';
import { Checkbox } from '@comp/ui/checkbox';
import { useState } from 'react';
import { toast } from 'sonner';

export interface EmailPreferences {
  policyNotifications: boolean;
  taskReminders: boolean;
  weeklyTaskDigest: boolean;
  unassignedItemsNotifications: boolean;
  taskMentions: boolean;
  taskAssignments: boolean;
}

interface Props {
  email: string;
  token: string;
  initialPreferences: EmailPreferences;
}

export function UnsubscribePreferencesClient({ email, token, initialPreferences }: Props) {
  // Invert preferences for display: true (receiving) becomes false (unchecked), false (unsubscribed) becomes true (checked)
  const [preferences, setPreferences] = useState<EmailPreferences>({
    policyNotifications: !initialPreferences.policyNotifications,
    taskReminders: !initialPreferences.taskReminders,
    weeklyTaskDigest: !initialPreferences.weeklyTaskDigest,
    unassignedItemsNotifications: !initialPreferences.unassignedItemsNotifications,
    taskMentions: !initialPreferences.taskMentions,
    taskAssignments: !initialPreferences.taskAssignments,
  });
  const [error, setError] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);

  const handleToggle = (key: keyof EmailPreferences, checked: boolean) => {
    // checked = true means unsubscribe (store false in DB), unchecked = false means subscribe (store true in DB)
    setPreferences((prev) => ({
      ...prev,
      [key]: checked,
    }));
  };

  const handleSelectAll = () => {
    // If all are unchecked (all receiving), check all (unsubscribe all)
    // If any are checked (some unsubscribed), uncheck all (subscribe all)
    const allUnsubscribed = Object.values(preferences).every((v) => v === true);
    setPreferences({
      policyNotifications: !allUnsubscribed,
      taskReminders: !allUnsubscribed,
      weeklyTaskDigest: !allUnsubscribed,
      unassignedItemsNotifications: !allUnsubscribed,
      taskMentions: !allUnsubscribed,
      taskAssignments: !allUnsubscribed,
    });
  };

  const handleSave = async () => {
    setError('');
    setIsSaving(true);

    // Invert preferences before saving: checked (true) = unsubscribed (false in DB), unchecked (false) = subscribed (true in DB)
    const invertedPreferences = {
      policyNotifications: !preferences.policyNotifications,
      taskReminders: !preferences.taskReminders,
      weeklyTaskDigest: !preferences.weeklyTaskDigest,
      unassignedItemsNotifications: !preferences.unassignedItemsNotifications,
      taskMentions: !preferences.taskMentions,
      taskAssignments: !preferences.taskAssignments,
    };

    try {
      const response = await fetch('/api/email-preferences', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          token,
          preferences: invertedPreferences,
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        setError(result.error || 'Failed to save preferences');
        return;
      }

      toast.success('Preferences saved successfully');
      setError('');
    } catch {
      setError('Failed to save preferences');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-2xl rounded-lg bg-card p-8 shadow-md border">
        <h1 className="mb-6 text-2xl font-bold text-foreground">
          Unsubscribe from Email Notifications
        </h1>
        <p className="mb-6 text-muted-foreground">
          Check the boxes below to unsubscribe from specific email notifications at{' '}
          <span className="font-semibold text-foreground">{email}</span>.
        </p>

        <div className="mb-6 space-y-4">
          <div className="flex items-center justify-between border-b pb-4">
            <div>
              <label className="text-base font-medium text-foreground">Unsubscribe from All</label>
              <p className="text-sm text-muted-foreground">Toggle all notifications at once</p>
            </div>
            <Button onClick={handleSelectAll} variant="outline" size="sm">
              {Object.values(preferences).every((v) => v === true)
                ? 'Subscribe to All'
                : 'Unsubscribe from All'}
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
                <div className="font-medium text-foreground">
                  Unsubscribe from Policy Notifications
                </div>
                <div className="text-sm text-muted-foreground">
                  Stop receiving emails when new policies are published or existing policies are
                  updated
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
                <div className="font-medium text-foreground">Unsubscribe from Task Reminders</div>
                <div className="text-sm text-muted-foreground">
                  Stop receiving reminders when tasks are due soon or overdue
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
                <div className="font-medium text-foreground">
                  Unsubscribe from Weekly Task Digest
                </div>
                <div className="text-sm text-muted-foreground">
                  Stop receiving weekly summaries of pending tasks
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
                <div className="font-medium text-foreground">
                  Unsubscribe from Unassigned Items Notifications
                </div>
                <div className="text-sm text-muted-foreground">
                  Stop receiving notifications when items need reassignment after a member is
                  removed
                </div>
              </div>
            </label>

            <label className="flex cursor-pointer items-start gap-4 rounded-lg border p-4 hover:bg-muted/50 transition-colors">
              <Checkbox
                checked={preferences.taskMentions}
                onCheckedChange={(checked) => handleToggle('taskMentions', checked === true)}
                className="mt-1 shrink-0"
              />
              <div className="flex-1 min-w-0">
                <div className="font-medium text-foreground">
                  Unsubscribe from Task Mentions
                </div>
                <div className="text-sm text-muted-foreground">
                  Stop receiving notifications when someone mentions you in a task
                </div>
              </div>
            </label>

            <label className="flex cursor-pointer items-start gap-4 rounded-lg border p-4 hover:bg-muted/50 transition-colors">
              <Checkbox
                checked={preferences.taskAssignments}
                onCheckedChange={(checked) => handleToggle('taskAssignments', checked === true)}
                className="mt-1 shrink-0"
              />
              <div className="flex-1 min-w-0">
                <div className="font-medium text-foreground">
                  Unsubscribe from Task Assignments
                </div>
                <div className="text-sm text-muted-foreground">
                  Stop receiving notifications when someone assigns a task to you
                </div>
              </div>
            </label>
          </div>
        </div>

        {error && (
          <div className="mb-4 rounded-md bg-destructive/10 border border-destructive/20 p-4 text-sm text-destructive">
            {error}
          </div>
        )}

        <div className="flex justify-end space-x-4">
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? 'Saving...' : 'Save Preferences'}
          </Button>
        </div>

        <p className="mt-6 text-xs text-muted-foreground">
          You can change these preferences at any time by clicking the unsubscribe link in any
          email.
        </p>
      </div>
    </div>
  );
}
