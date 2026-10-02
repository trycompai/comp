import { auth } from '@/app/lib/auth';
import { getPortalPolicy, getPortalPolicyMember } from '@/lib/portal-policy-access';
import { BUCKET_NAME, getSignedUrl, s3Client } from '@/utils/s3';
import { GetObjectCommand } from '@aws-sdk/client-s3';
import { type NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const session = await auth.api.getSession({ headers: req.headers });
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const policyId = req.nextUrl.searchParams.get('policyId');
  const organizationId = req.nextUrl.searchParams.get('organizationId');
  const versionId = req.nextUrl.searchParams.get('versionId');
  if (!policyId || !organizationId) {
    return NextResponse.json({ error: 'Missing policyId or organizationId' }, { status: 400 });
  }

  try {
    const member = await getPortalPolicyMember({ userId: session.user.id, organizationId });
    if (!member) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const policy = await getPortalPolicy({
      policyId,
      organizationId,
      department: member.department,
    });
    // Employees can only read the currently published version, never a pending or historical version.
    if (!policy || (versionId && policy.currentVersion?.id !== versionId)) {
      return NextResponse.json({ success: false, error: 'Policy not found.' }, { status: 404 });
    }

    const pdfUrl = policy.currentVersion?.pdfUrl ?? policy.pdfUrl;
    if (!pdfUrl) {
      return NextResponse.json({ success: false, error: 'No PDF found.' }, { status: 404 });
    }

    const command = new GetObjectCommand({ Bucket: BUCKET_NAME, Key: pdfUrl });
    const signedUrl = await getSignedUrl(s3Client, command, { expiresIn: 900 });
    return NextResponse.json({ success: true, url: signedUrl });
  } catch {
    return NextResponse.json({ success: false, error: 'Could not retrieve PDF.' }, { status: 500 });
  }
}
