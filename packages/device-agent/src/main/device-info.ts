import { execSync } from 'node:child_process';
import { hostname } from 'node:os';
import type { DeviceInfo, DevicePlatform } from '../shared/types';

/**
 * Collects information about the current device.
 */
export function getDeviceInfo(): DeviceInfo {
  const platform = getDevicePlatform();

  return {
    name: getComputerName(),
    hostname: hostname(),
    platform,
    osVersion: getOSVersion(platform),
    serialNumber: getSerialNumber(platform),
    hardwareModel: getHardwareModel(platform),
  };
}

function getDevicePlatform(): DevicePlatform {
  if (process.platform === 'win32') return 'windows';
  if (process.platform === 'linux') return 'linux';
  return 'macos';
}

function getComputerName(): string {
  try {
    if (process.platform === 'darwin') {
      return execSync('scutil --get ComputerName', { encoding: 'utf-8', timeout: 5000 }).trim();
    }
    if (process.platform === 'win32' || process.platform === 'linux') {
      return execSync('hostname', { encoding: 'utf-8', timeout: 5000 }).trim();
    }
  } catch {
    // Fallback
  }
  return hostname();
}

function getOSVersion(platform: DevicePlatform): string {
  try {
    if (platform === 'macos') {
      return execSync('sw_vers -productVersion', { encoding: 'utf-8', timeout: 5000 }).trim();
    }
    if (platform === 'linux') {
      // Try lsb_release first, fall back to /etc/os-release
      try {
        return execSync('lsb_release -ds 2>/dev/null', {
          encoding: 'utf-8',
          timeout: 5000,
        }).trim();
      } catch {
        return execSync(
          'cat /etc/os-release 2>/dev/null | grep "^PRETTY_NAME=" | cut -d= -f2 | tr -d \'"\'',
          { encoding: 'utf-8', timeout: 5000 },
        ).trim();
      }
    }
    if (platform === 'windows') {
      const output = execSync(
        'powershell.exe -NoProfile -NonInteractive -Command "[System.Environment]::OSVersion.Version.ToString()"',
        { encoding: 'utf-8', timeout: 5000 },
      ).trim();
      return output;
    }
  } catch {
    // Fallback
  }
  return 'Unknown';
}

function getSerialNumber(platform: DevicePlatform): string | undefined {
  try {
    if (platform === 'macos') {
      return (
        execSync("system_profiler SPHardwareDataType | awk '/Serial Number/{print $4}'", {
          encoding: 'utf-8',
          timeout: 5000,
        }).trim() || undefined
      );
    }
    if (platform === 'linux') {
      return (
        execSync('cat /sys/class/dmi/id/product_serial 2>/dev/null', {
          encoding: 'utf-8',
          timeout: 5000,
        }).trim() || undefined
      );
    }
    if (platform === 'windows') {
      return (
        execSync(
          'powershell.exe -NoProfile -NonInteractive -Command "(Get-CimInstance Win32_BIOS).SerialNumber"',
          { encoding: 'utf-8', timeout: 5000 },
        ).trim() || undefined
      );
    }
  } catch {
    // Serial number is optional
  }
  return undefined;
}

function getHardwareModel(platform: DevicePlatform): string | undefined {
  try {
    if (platform === 'macos') {
      return (
        execSync(
          'system_profiler SPHardwareDataType | awk \'/Model Name/{$1=$2=""; print substr($0,3)}\'',
          { encoding: 'utf-8', timeout: 5000 },
        ).trim() || undefined
      );
    }
    if (platform === 'linux') {
      return (
        execSync('cat /sys/class/dmi/id/product_name 2>/dev/null', {
          encoding: 'utf-8',
          timeout: 5000,
        }).trim() || undefined
      );
    }
    if (platform === 'windows') {
      return (
        execSync(
          'powershell.exe -NoProfile -NonInteractive -Command "(Get-CimInstance Win32_ComputerSystem).Model"',
          { encoding: 'utf-8', timeout: 5000 },
        ).trim() || undefined
      );
    }
  } catch {
    // Hardware model is optional
  }
  return undefined;
}
