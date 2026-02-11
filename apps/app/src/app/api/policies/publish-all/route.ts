import { serverApi } from '@/lib/api-server';
import { sendPublishAllPoliciesEmail } from '@/trigger/tasks/email/publish-all-policies-email';
import { NextResponse } from 'next/server';

export async function POST() {
  const response = await serverApi.post<{
    success: boolean;
    publishedCount: number;
    members: {
      email: string;
      userName: string;
      organizationName: string;
      organizationId: string;
    }[];
  }>('/v1/policies/publish-all');

  if (response.error || !response.data) {
    return NextResponse.json(
      { success: false, error: response.error || 'Failed to publish policies' },
      { status: response.status || 500 },
    );
  }

  // Trigger emails via Trigger.dev
  const { members } = response.data;
  if (members.length > 0) {
    try {
      await sendPublishAllPoliciesEmail.batchTrigger(
        members.map((m) => ({ payload: m })),
      );
    } catch (emailError) {
      console.error('[publish-all] Failed to trigger bulk emails:', emailError);
      // Don't fail — policies are already published
    }
  }

  return NextResponse.json({ success: true });
}
