'use server';

import { resendPortalInviteViaApi } from '@/lib/people-api';

export const resendPortalInvite = async (memberId: string) => {
  try {
    const response = await resendPortalInviteViaApi({ memberId });
    if (response.error) {
      throw new Error(response.error);
    }
    return { success: true };
  } catch (error) {
    console.error('Error resending portal invite:', error);
    throw error;
  }
};
