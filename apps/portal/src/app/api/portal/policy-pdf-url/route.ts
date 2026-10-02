import { auth } from '@/app/lib/auth';
import { BUCKET_NAME, getSignedUrl, s3Client } from '@/utils/s3';
import { GetObjectCommand } from '@aws-sdk/client-s3';
import { db } from '@db/server';
import { type NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const session = await auth.api.getSession({ headers: req.headers });

  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const policyId = req.nextUrl.searchParams.get('policyId');
  const versionId = req.nextUrl.searchParams.get('versionId');

  if (!policyId) {
    return NextResponse.json({ error: 'Missing policyId' }, { status: 400 });
  }

  try {
    const policy = await db.policy.findUnique({
      where: { id: policyId, status: 'published' },
      select: {
        pdfUrl: true,
        organizationId: true,
        currentVersion: {
          select: { id: true, pdfUrl: true },
        },
      },
    });

    if (!policy) {
      return NextResponse.json({ success: false, error: 'Policy not found.' });
    }

    const member = await db.member.findFirst({
      where: {
        userId: session.user.id,
        organizationId: policy.organizationId,
        isActive: true,
        deactivated: false,
      },
    });

    if (!member) {
      return NextResponse.json({ success: false, error: 'Access denied.' });
    }

    // Determine which pdfUrl to use
    let pdfUrl: string | null = null;

    if (versionId) {
      // IMPORTANT: scope the lookup to this policy to prevent cross-policy/cross-org access
      const version = await db.policyVersion.findUnique({
        where: { id: versionId, policyId },
        select: { pdfUrl: true },
      });
      pdfUrl = version?.pdfUrl ?? null;
    } else if (policy.currentVersion?.pdfUrl) {
      pdfUrl = policy.currentVersion.pdfUrl;
    } else {
      pdfUrl = policy.pdfUrl;
    }

    if (!pdfUrl) {
      return NextResponse.json({ success: false, error: 'No PDF found.' });
    }

    const command = new GetObjectCommand({
      Bucket: BUCKET_NAME,
      Key: pdfUrl,
    });
    const signedUrl = await getSignedUrl(s3Client, command, { expiresIn: 900 });

    return NextResponse.json({ success: true, url: signedUrl });
  } catch {
    return NextResponse.json({ success: false, error: 'Could not retrieve PDF.' }, { status: 500 });
  }
}
