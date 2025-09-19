import TaskReviewNotificationEmail from '../emails/task-review-notification';
import { sendEmail } from './resend';

export const sendTaskReviewNotificationEmail = async (params: {
  email: string;
  userName: string;
  taskName: string;
  organizationName: string;
  organizationId: string;
  taskId: string;
}) => {
  const { email, userName, taskName, organizationName, organizationId, taskId } = params;

  try {
    const sent = await sendEmail({
      to: email,
      subject: 'Task review required',
      react: TaskReviewNotificationEmail({
        email,
        userName,
        taskName,
        organizationName,
        organizationId,
        taskId,
      }),
      system: true,
    });

    if (!sent) {
      console.error('Failed to send task review notification email');
      return { success: false };
    }

    return { success: true };
  } catch (error) {
    console.error('Error sending task review notification email:', error);
    return { success: false };
  }
};


