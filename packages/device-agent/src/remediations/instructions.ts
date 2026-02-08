import type { DeviceCheckType, DevicePlatform } from '../shared/types';

/**
 * Per-check, per-platform guided instructions for users when
 * auto-remediation is not available or as supplementary guidance.
 */

interface InstructionSet {
  description: string;
  steps: string[];
}

const MACOS_INSTRUCTIONS: Record<DeviceCheckType, InstructionSet> = {
  screen_lock: {
    description: 'Enable screen lock with a 5-minute timeout',
    steps: [
      'Open System Settings',
      'Go to Lock Screen',
      'Set "Start Screen Saver when inactive" to 5 minutes or less',
      'Set "Require password after screen saver begins or display is turned off" to Immediately',
    ],
  },
  password_policy: {
    description: 'Set a minimum password length of 8 characters',
    steps: [
      'An administrator password will be required to apply this setting',
      'Click "Fix" to set the policy, or apply it manually:',
      'Open Terminal',
      'Run: sudo pwpolicy -setglobalpolicy "minChars=8"',
      'Enter your administrator password when prompted',
    ],
  },
  disk_encryption: {
    description: 'Enable FileVault disk encryption',
    steps: [
      'Open System Settings',
      'Go to Privacy & Security',
      'Scroll down to FileVault',
      'Click "Turn On…"',
      'Choose a recovery method (iCloud account or recovery key)',
      'Your Mac will begin encrypting in the background',
    ],
  },
  antivirus: {
    description: 'Ensure antivirus protection is active',
    steps: [
      'macOS includes XProtect, which is built-in and always active',
      'If this check is failing, ensure your macOS is up to date:',
      'Open System Settings > General > Software Update',
      'Install any available updates',
      'Alternatively, install a third-party antivirus (e.g. CrowdStrike, SentinelOne)',
    ],
  },
};

const LINUX_INSTRUCTIONS: Record<DeviceCheckType, InstructionSet> = {
  screen_lock: {
    description: 'Enable screen lock with a 5-minute timeout',
    steps: [
      'GNOME: Open Settings > Privacy > Screen Lock',
      'Set "Blank Screen Delay" to 5 minutes or less',
      'Enable "Automatic Screen Lock"',
      'Set "Automatic Screen Lock Delay" to immediately',
      'KDE: Open System Settings > Workspace Behavior > Screen Locking',
      'Set "Lock screen automatically after" to 5 minutes or less',
    ],
  },
  password_policy: {
    description: 'Set a minimum password length of 8 characters',
    steps: [
      'An administrator password will be required to apply this setting',
      'Click "Fix" to set the policy, or apply it manually:',
      'Open a terminal',
      'Run: sudo sed -i "s/^PASS_MIN_LEN.*/PASS_MIN_LEN\\t8/" /etc/login.defs',
      'Optionally install pam_pwquality: sudo apt install libpam-pwquality',
      'Configure minlen=8 in /etc/security/pwquality.conf',
    ],
  },
  disk_encryption: {
    description: 'Enable LUKS disk encryption',
    steps: [
      'LUKS encryption must be set up during OS installation',
      'Back up all important data before proceeding',
      'Reinstall your Linux distribution and select "Encrypt the new installation" during setup',
      'Choose a strong passphrase for the encryption',
      'Store the recovery key in a safe location',
      'Note: It is not possible to encrypt an existing root partition without reinstalling',
    ],
  },
  antivirus: {
    description: 'Install antivirus or security software',
    steps: [
      'Install ClamAV: sudo apt install clamav clamav-daemon (Debian/Ubuntu)',
      'Or: sudo dnf install clamav clamd (Fedora/RHEL)',
      'Start the service: sudo systemctl enable --now clamav-daemon',
      'Update virus definitions: sudo freshclam',
      'Alternatively, ensure AppArmor or SELinux is in enforcing mode:',
      'AppArmor: sudo aa-enforce /etc/apparmor.d/*',
      'SELinux: sudo setenforce 1',
    ],
  },
};

const WINDOWS_INSTRUCTIONS: Record<DeviceCheckType, InstructionSet> = {
  screen_lock: {
    description: 'Enable screen lock with a 5-minute timeout',
    steps: [
      'Open Settings > Personalization > Lock screen',
      'Click "Screen saver settings"',
      'Set the wait time to 5 minutes or less',
      'Check "On resume, display logon screen"',
      'Click OK',
    ],
  },
  password_policy: {
    description: 'Set a minimum password length of 8 characters',
    steps: [
      'A UAC (admin) prompt will appear to apply this setting',
      'Click "Fix" to set the policy, or apply it manually:',
      'Open Command Prompt as Administrator',
      'Run: net accounts /minpwlen:8',
      'The policy will take effect immediately',
    ],
  },
  disk_encryption: {
    description: 'Enable BitLocker disk encryption',
    steps: [
      'Open Settings > Privacy & security > Device encryption',
      'If Device encryption is available, turn it on',
      'Alternatively, search for "BitLocker" in the Start menu',
      'Click "Turn on BitLocker" for the C: drive',
      'Choose how to back up your recovery key',
      'Select encryption mode and start encrypting',
      'Note: BitLocker requires TPM or a compatible security chip',
    ],
  },
  antivirus: {
    description: 'Ensure antivirus protection is active',
    steps: [
      'Open Windows Security from the Start menu',
      'Click "Virus & threat protection"',
      'Ensure "Real-time protection" is turned on',
      'If Windows Defender is disabled by a third-party AV, ensure that AV is active',
      'Run a quick scan to verify protection is working',
    ],
  },
};

/**
 * Returns the guided instructions for a specific check on a specific platform.
 */
export function getInstructions(
  platform: DevicePlatform,
  checkType: DeviceCheckType,
): InstructionSet {
  const platformMap: Record<DevicePlatform, Record<DeviceCheckType, InstructionSet>> = {
    macos: MACOS_INSTRUCTIONS,
    linux: LINUX_INSTRUCTIONS,
    windows: WINDOWS_INSTRUCTIONS,
  };
  return platformMap[platform][checkType];
}
