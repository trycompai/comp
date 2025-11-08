import WeeklyTaskDigestEmail from '../emails/reminders/weekly-task-digest';
import { sendEmail } from './resend';

const getTaskCountMessage = (count: number) => {
  const plural = count !== 1 ? 's' : '';
  return `You have ${count} pending task${plural} that are not yet completed`;
};

export const sendWeeklyTaskDigestEmail = async (params: {
  email: string;
  userName: string;
  organizationName: string;
  organizationId: string;
  tasks: Array<{
    id: string;
    title: string;
  }>;
}) => {
  const { email, userName, organizationName, organizationId, tasks } = params;

  const subjectText = getTaskCountMessage(tasks.length);

  try {
    const sent = await sendEmail({
      to: email,
      subject: subjectText,
      react: WeeklyTaskDigestEmail({
        email,
        userName,
        organizationName,
        organizationId,
        tasks,
      }),
      system: true,
    });

    if (!sent) {
      console.error('Failed to send weekly task digest email');
      return { success: false };
    }

    return { success: true };
  } catch (error) {
    console.error('Error sending weekly task digest email:', error);
    return { success: false };
  }
};

