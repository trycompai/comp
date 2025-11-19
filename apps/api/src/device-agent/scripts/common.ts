import type { SupportedOS } from './types';

export function getScriptFilename(os: SupportedOS): string {
  return os === 'macos' ? 'run_me_first.command' : 'run_me_first.bat';
}

export function getPackageFilename(os: SupportedOS): string {
  return os === 'macos' ? 'compai-device-agent.pkg' : 'compai-device-agent.msi';
}
