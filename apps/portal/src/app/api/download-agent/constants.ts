import type { SupportedOS } from './types';

export const S3_PREFIX = 'device-agent';

export const DOWNLOAD_TARGETS: Record<
  SupportedOS,
  { key: string; filename: string; contentType: string }
> = {
  macos: {
    key: `${S3_PREFIX}/macos/latest-arm64.dmg`,
    filename: 'CompAI-Device-Agent-arm64.dmg',
    contentType: 'application/x-apple-diskimage',
  },
  'macos-intel': {
    key: `${S3_PREFIX}/macos/latest-x64.dmg`,
    filename: 'CompAI-Device-Agent-x64.dmg',
    contentType: 'application/x-apple-diskimage',
  },
  windows: {
    key: `${S3_PREFIX}/windows/latest-setup.exe`,
    filename: 'CompAI-Device-Agent-setup.exe',
    contentType: 'application/octet-stream',
  },
  linux: {
    key: `${S3_PREFIX}/linux/latest-x64.deb`,
    filename: 'CompAI-Device-Agent-x64.deb',
    contentType: 'application/vnd.debian.binary-package',
  },
};
