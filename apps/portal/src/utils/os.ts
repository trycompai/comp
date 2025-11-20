export type SupportedOS = 'macos' | 'windows' | 'macos-intel';

const isSafariUA = (ua: string) =>
  ua.includes('safari') &&
  !ua.includes('chrome') &&
  !ua.includes('crios') &&
  !ua.includes('fxios') &&
  !ua.includes('edgios');

const hasArmIndicators = (ua: string) =>
  ua.includes('arm64') || ua.includes('aarch64') || ua.includes('apple');

export async function detectOSFromUserAgent(): Promise<SupportedOS | null> {
  try {
    const ua = navigator.userAgent.toLowerCase();

    if (ua.includes('win')) {
      return 'windows';
    }

    if (ua.includes('mac')) {
      if ('userAgentData' in navigator && navigator.userAgentData) {
        const data: { architecture?: string } = await (
          navigator.userAgentData as {
            getHighEntropyValues: (hints: string[]) => Promise<{ architecture?: string }>;
          }
        ).getHighEntropyValues(['architecture']);

        if (data.architecture === 'arm') return 'macos';
        if (data.architecture === 'x86') return 'macos-intel';
      }

      if (hasArmIndicators(ua)) return 'macos';

      const safari = isSafariUA(ua);

      if (!safari && ua.includes('intel')) {
        return 'macos-intel';
      }

      return 'macos';
    }

    return null;
  } catch (error) {
    console.error('Error detecting OS:', error);
    return null;
  }
}
