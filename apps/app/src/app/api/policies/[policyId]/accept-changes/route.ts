import { serverApi } from '@/lib/api-server';
import { sendNewPolicyEmail } from '@/trigger/tasks/email/new-policy-email';
import { NextResponse } from 'next/server';

interface PolicyEmailRecipient {
  email: string;
  userName: string;
  policyName: string;
  organizationId: string;
  organizationName: string;
  notificationType: 'new' | 'updated' | 're-acceptance';
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ policyId: string }> },
) {
  const { policyId } = await params;
  const body = await request.json();

  const response = await serverApi.post<{
    data: {
      versionId: string;
      version: number;
      members: PolicyEmailRecipient[];
    };
  }>(`/v1/policies/${policyId}/accept-changes`, body);

  if (response.error || !response.data) {
    return NextResponse.json(
      {
        success: false,
        error: response.error || 'Failed to accept policy changes',
      },
      { status: response.status || 500 },
    );
  }

  // Notify everyone who must re-acknowledge the new version. The version is
  // already published, so email failures must not fail the request.
  const members = response.data.data?.members ?? [];
  if (members.length > 0) {
    try {
      await sendNewPolicyEmail.batchTrigger(members.map((m) => ({ payload: m })));
    } catch (emailError) {
      console.error('[accept-changes] Failed to trigger notification emails:', emailError);
      // Don't fail — the policy version is already published.
    }
  }

  return NextResponse.json({ success: true });
}
