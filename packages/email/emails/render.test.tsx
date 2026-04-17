import { render } from '@react-email/render';
import { describe, expect, it } from 'vitest';
import { AllPolicyNotificationEmail } from './all-policy-notification';
import { InviteEmail } from './invite';
import { InvitePortalEmail } from './invite-portal';
import { MagicLinkEmail } from './magic-link';
import { WelcomeEmail } from './marketing/welcome';
import { OTPVerificationEmail } from './otp';
import { PolicyAcknowledgmentDigestEmail } from './policy-acknowledgment-digest';
import { PolicyNotificationEmail } from './policy-notification';
import { TaskReminderEmail } from './reminders/task-reminder';
import { TaskStatusNotificationEmail } from './reminders/task-status-notification';
import { WeeklyTaskDigestEmail } from './reminders/weekly-task-digest';
import { TrainingCompletedEmail } from './training-completed';
import { UnassignedItemsNotificationEmail } from './unassigned-items-notification';

// Regression: PR #2501 removed <head> from every template, which broke
// @react-email/tailwind's media-query injection (md:* classes) and caused
// every email to render to an empty Suspense fallback in production.
// These tests fail if any template renders to that fallback or otherwise
// produces broken output, so the same mistake can't ship again.

const SUSPENSE_ERROR_MARKER = '<!--$!-->';

const cases = [
  {
    name: 'weekly-task-digest',
    el: (
      <WeeklyTaskDigestEmail
        email="user@example.com"
        userName="User"
        organizationName="Acme"
        organizationId="org_123"
        tasks={[{ id: 't1', title: 'Task one' }]}
      />
    ),
  },
  {
    name: 'task-reminder',
    el: (
      <TaskReminderEmail email="user@example.com" name="User" dueDate="2026-04-20" recordId="r1" />
    ),
  },
  {
    name: 'task-status-notification',
    el: (
      <TaskStatusNotificationEmail
        email="user@example.com"
        userName="User"
        taskName="Task"
        oldStatus="todo"
        newStatus="done"
        organizationName="Acme"
        organizationId="org_123"
        taskId="t1"
        changedByName="Admin"
      />
    ),
  },
  {
    name: 'invite-portal',
    el: (
      <InvitePortalEmail
        email="user@example.com"
        inviteLink="https://app.trycomp.ai/invite"
        organizationName="Acme"
      />
    ),
  },
  {
    name: 'invite',
    el: (
      <InviteEmail
        email="user@example.com"
        organizationName="Acme"
        inviteLink="https://app.trycomp.ai/invite"
      />
    ),
  },
  { name: 'welcome', el: <WelcomeEmail name="User" /> },
  {
    name: 'policy-notification',
    el: (
      <PolicyNotificationEmail
        email="user@example.com"
        userName="User"
        organizationName="Acme"
        organizationId="org_123"
        policyName="Acceptable Use"
        policyId="p1"
        isUpdate={false}
      />
    ),
  },
  {
    name: 'magic-link',
    el: (
      <MagicLinkEmail
        email="user@example.com"
        url="https://app.trycomp.ai/magic"
        inviteCode="abc"
      />
    ),
  },
  {
    name: 'all-policy-notification',
    el: (
      <AllPolicyNotificationEmail
        email="user@example.com"
        userName="User"
        organizationName="Acme"
        organizationId="org_123"
        isUpdate={false}
      />
    ),
  },
  { name: 'otp', el: <OTPVerificationEmail email="user@example.com" otp="123456" /> },
  {
    name: 'training-completed',
    el: (
      <TrainingCompletedEmail
        email="user@example.com"
        userName="User"
        organizationName="Acme"
        completedAt={new Date('2026-04-13')}
      />
    ),
  },
  {
    name: 'unassigned-items-notification',
    el: (
      <UnassignedItemsNotificationEmail
        email="user@example.com"
        userName="User"
        organizationName="Acme"
        organizationId="org_123"
        removedMemberName="Former"
        unassignedItems={[{ type: 'task', id: 't1', name: 'Task' }]}
      />
    ),
  },
  {
    name: 'policy-acknowledgment-digest',
    el: (
      <PolicyAcknowledgmentDigestEmail
        email="user@example.com"
        userName="User"
        organizationName="Acme"
        organizationId="org_123"
        policies={[
          {
            id: 'p1',
            name: 'Acceptable Use Policy',
            url: 'https://portal.trycomp.ai/org_123/policy/p1',
          },
          {
            id: 'p2',
            name: 'Security Policy',
            url: 'https://portal.trycomp.ai/org_123/policy/p2',
          },
        ]}
      />
    ),
  },
];

describe('email templates render to non-empty HTML', () => {
  for (const { name, el } of cases) {
    it(name, async () => {
      const html = await render(el);
      expect(html).not.toContain(SUSPENSE_ERROR_MARKER);
      expect(html).toContain('<body');
      expect(html.length).toBeGreaterThan(2000);
    });
  }
});
