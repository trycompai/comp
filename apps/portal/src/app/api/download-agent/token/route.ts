import { auth } from '@/app/lib/auth';
import { logger } from '@/utils/logger';
import { client as kv } from '@comp/kv';
import { randomBytes } from 'crypto';
import { type NextRequest, NextResponse } from 'next/server';
import { createFleetLabel } from '../fleet-label';
import type { DownloadAgentRequest, SupportedOS } from '../types';
import { detectOSFromUserAgent, validateMemberAndOrg } from '../utils';

const SUPPORTED_OSES: SupportedOS[] = ['macos', 'macos-intel', 'windows'];

const isSupportedOS = (value: unknown): value is SupportedOS =>
  typeof value === 'string' && SUPPORTED_OSES.includes(value as SupportedOS);

export async function POST(req: NextRequest) {
  // Authentication
  const session = await auth.api.getSession({
    headers: req.headers,
  });

  if (!session?.user) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  // Validate request body
  const { orgId, employeeId, os }: DownloadAgentRequest = await req.json();

  if (!orgId || !employeeId) {
    return new NextResponse('Missing orgId or employeeId', { status: 400 });
  }

  // Validate member and organization
  const member = await validateMemberAndOrg(session.user.id, orgId);
  if (!member) {
    return new NextResponse('Member not found or organization invalid', { status: 404 });
  }

  // Auto-detect OS from User-Agent, but allow explicit overrides from the client
  const userAgent = req.headers.get('user-agent');
  const detectedOS = isSupportedOS(os) ? os : detectOSFromUserAgent(userAgent);

  if (!detectedOS) {
    return new NextResponse(
      'Could not determine operating system. Please select an OS and try again.',
      { status: 400 },
    );
  }

  logger('Token route: Starting fleet label creation', {
    employeeId,
    memberId: member.id,
    os: detectedOS,
    orgId,
    userId: session.user.id,
  });

  // Hardcoded device marker paths used by the setup scripts
  const fleetDevicePathMac = '/Users/Shared/.fleet';
  const fleetDevicePathWindows = 'C:\\ProgramData\\CompAI\\Fleet';

  // Create Fleet label
  try {
    await createFleetLabel({
      employeeId,
      memberId: member.id,
      os: detectedOS,
      fleetDevicePathMac,
      fleetDevicePathWindows,
    });

    logger('Token route: Fleet label creation completed successfully', {
      employeeId,
      memberId: member.id,
      os: detectedOS,
      orgId,
    });
  } catch (error) {
    logger('Token route: Error creating fleet label', {
      employeeId,
      memberId: member.id,
      os: detectedOS,
      orgId,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });

    return new NextResponse('Failed to create fleet label', { status: 500 });
  }

  // Generate a secure random token
  logger('Generating download token', { employeeId, os: detectedOS, orgId });
  const token = randomBytes(32).toString('hex');

  // Store token with download info in KV store (expires in 5 minutes)
  logger('Storing download token in KV store', {
    employeeId,
    os: detectedOS,
    orgId,
    tokenLength: token.length,
    expiresInSeconds: 300,
  });

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

  logger('Download token created and stored successfully', {
    employeeId,
    os: detectedOS,
    orgId,
    userId: session.user.id,
  });

  return NextResponse.json({ token });
}
