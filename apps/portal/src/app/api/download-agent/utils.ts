import { logger } from '@/utils/logger';
import { db } from '@db';
import type { SupportedOS } from './types';

/**
 * Detects the operating system (and for macOS, the CPU architecture) from a User-Agent string.
 *
 * Returns:
 * - 'windows' for Windows OS
 * - 'macos' for Apple Silicon (ARM-based) Macs
 * - 'macos-intel' for Intel-based Macs
 *
 * Examples of User-Agent strings:
 * - Windows: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
 * - macOS (Intel): "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36"
 * - macOS (Apple Silicon): "Mozilla/5.0 (Macintosh; ARM Mac OS X 11_2_3) AppleWebKit/537.36"
 */
const isSafariUA = (ua: string) =>
  ua.includes('safari') &&
  !ua.includes('chrome') &&
  !ua.includes('crios') &&
  !ua.includes('fxios') &&
  !ua.includes('edgios');

const hasArmIndicators = (ua: string) =>
  ua.includes('arm') || ua.includes('arm64') || ua.includes('aarch64') || ua.includes('apple');

export function detectOSFromUserAgent(userAgent: string | null): SupportedOS | null {
  if (!userAgent) return null;

  const ua = userAgent.toLowerCase();

  if (ua.includes('windows') || ua.includes('win32') || ua.includes('win64')) {
    return 'windows';
  }

  if (ua.includes('macintosh') || (ua.includes('mac os') && !ua.includes('like mac'))) {
    if (hasArmIndicators(ua)) {
      return 'macos';
    }

    if (!isSafariUA(ua) && ua.includes('intel')) {
      return 'macos-intel';
    }

    return 'macos';
  }

  return null;
}

export async function validateMemberAndOrg(userId: string, orgId: string) {
  const member = await db.member.findFirst({
    where: {
      userId,
      organizationId: orgId,
      deactivated: false,
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
