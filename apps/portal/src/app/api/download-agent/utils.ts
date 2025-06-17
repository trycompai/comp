import { db } from '@comp/db';
import type { SupportedOS } from './types';
import { logger } from '@/utils/logger';

/**
 * Detects the operating system from a User-Agent string
 *
 * Examples of User-Agent strings:
 * - Windows: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
 * - macOS: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36"
 */
export function detectOSFromUserAgent(userAgent: string | null): SupportedOS | null {
  if (!userAgent) return null;

  const ua = userAgent.toLowerCase();

  // Check for Windows (must check before Android since Android UA contains "linux")
  if (ua.includes('windows') || ua.includes('win32') || ua.includes('win64')) {
    return 'windows';
  }

  // Check for macOS (must check before iOS since iOS UA contains "mac")
  if (ua.includes('macintosh') || (ua.includes('mac os') && !ua.includes('like mac'))) {
    return 'macos';
  }

  return null;
}

export async function validateMemberAndOrg(userId: string, orgId: string) {
  const member = await db.member.findFirst({
    where: {
      userId,
      organizationId: orgId,
    },
  });

  if (!member) {
    logger('Member not found', { userId, orgId });
    return null;
  }

  const org = await db.organization.findUnique({
    where: {
      id: orgId,
    },
  });

  if (!org) {
    logger('Organization not found', { orgId });
    return null;
  }

  return member;
}
