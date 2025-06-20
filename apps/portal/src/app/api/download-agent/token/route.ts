import { auth } from '@/app/lib/auth';
import { client as kv } from '@comp/kv';
import { randomBytes } from 'crypto';
import { type NextRequest, NextResponse } from 'next/server';
import type { DownloadAgentRequest } from '../types';
import { detectOSFromUserAgent, validateMemberAndOrg } from '../utils';

export async function POST(req: NextRequest) {
  // Authentication
  const session = await auth.api.getSession({
    headers: req.headers,
  });

  if (!session?.user) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  // Validate request body
  const { orgId, employeeId }: DownloadAgentRequest = await req.json();

  if (!orgId || !employeeId) {
    return new NextResponse('Missing orgId or employeeId', { status: 400 });
  }

  // Validate member and organization
  const member = await validateMemberAndOrg(session.user.id, orgId);
  if (!member) {
    return new NextResponse('Member not found or organization invalid', { status: 404 });
  }

  // Auto-detect OS from User-Agent
  const userAgent = req.headers.get('user-agent');
  const detectedOS = detectOSFromUserAgent(userAgent);

  if (!detectedOS) {
    return new NextResponse(
      'Could not detect OS from User-Agent. Please use a standard browser on macOS or Windows.',
      { status: 400 },
    );
  }

  // Generate a secure random token
  const token = randomBytes(32).toString('hex');

  // Store token with download info in KV store (expires in 5 minutes)
  await kv.set(
    `download:${token}`,
    {
      orgId,
      employeeId,
      userId: session.user.id,
      os: detectedOS,
      createdAt: Date.now(),
    },
    { ex: 300 }, // 5 minutes
  );

  return NextResponse.json({ token });
}
