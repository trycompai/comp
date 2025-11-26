import UnassignedItemsNotificationEmail from '../emails/unassigned-items-notification';
import { sendEmail } from './resend';

export interface UnassignedItem {
  type: 'task' | 'policy' | 'risk' | 'vendor';
  id: string;
  name: string;
}

export const sendUnassignedItemsNotificationEmail = async (params: {
  email: string;
  userName: string;
  organizationName: string;
  organizationId: string;
  removedMemberName: string;
  unassignedItems: UnassignedItem[];
}) => {
  const {
    email,
    userName,
    organizationName,
    organizationId,
    removedMemberName,
    unassignedItems,
  } = params;

  if (unassignedItems.length === 0) {
    return { success: true };
  }

  const subjectText = 'Member removed - items require reassignment';

  try {
    const sent = await sendEmail({
      to: email,
      subject: subjectText,
      react: UnassignedItemsNotificationEmail({
        userName,
        organizationName,
        organizationId,
        removedMemberName,
        unassignedItems,
        email,
      }),
      system: true, // Use system email address
    });

    if (!sent) {
      console.error('Failed to send unassigned items notification email');
      return { success: false };
    }

    return { success: true };
  } catch (error) {
    console.error('Error sending unassigned items notification email:', error);
    return { success: false };
  }
};

