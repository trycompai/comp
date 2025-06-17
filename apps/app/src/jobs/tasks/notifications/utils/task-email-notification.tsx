import TaskReminderEmail from '@comp/email/emails/reminders/task-reminder';
import { TriggerEvents, trigger } from '@comp/notifications';
import { render } from '@react-email/render';

interface Props {
  owner: {
    id: string;
    fullName?: string;
    email: string;
    organizationId: string;
  };
  task: {
    recordId: string;
    dueDate: string;
  };
}

export async function sendTaskEmailNotification({ owner, task }: Props) {
  try {
    const html = await render(
      <TaskReminderEmail
        email={owner.email}
        name={owner.fullName ?? 'there'}
        dueDate={task.dueDate}
        recordId={task.recordId}
      />,
    );

    const triggerData = {
      name: TriggerEvents.TaskReminderEmail,
      payload: {
        subject: 'Task Reminder',
        html,
      },
      replyTo: owner.email,
      user: {
        subscriberId: `${owner.organizationId}_${owner.id}`,
        organizationId: owner.organizationId,
        email: owner.email,
        fullName: owner.fullName,
      },
    };

    await trigger(triggerData);
  } catch (error) {
    console.error('Failed to send task email notification: ', error);
    throw error;
  }
}
