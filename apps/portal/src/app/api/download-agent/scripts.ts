import type { ScriptConfig, SupportedOS } from './types';

export function generateMacScript(config: ScriptConfig): string {
  const { orgId, employeeId, fleetDevicePath } = config;

  return `#!/bin/bash
# Create org marker for Fleet policies/labels
set -euo pipefail
ORG_ID="${orgId}"
EMPLOYEE_ID="${employeeId}"
FLEET_DIR="${fleetDevicePath}"
mkdir -p "$FLEET_DIR"
echo "$ORG_ID" > "$FLEET_DIR/${orgId}"
echo "$EMPLOYEE_ID" > "$FLEET_DIR/${employeeId}"
chmod 755 "$FLEET_DIR"
chmod 644 "$FLEET_DIR/${orgId}"
chmod 644 "$FLEET_DIR/${employeeId}"
exit 0`;
}

export function generateWindowsScript(config: ScriptConfig): string {
  const { orgId, employeeId, fleetDevicePath } = config;

  return `@echo off
REM Create org marker for Fleet policies/labels
setlocal
set ORG_ID=${orgId}
set EMPLOYEE_ID=${employeeId}
set FLEET_DIR=${fleetDevicePath}
if not exist "%FLEET_DIR%" mkdir "%FLEET_DIR%"
echo %ORG_ID% > "%FLEET_DIR%\\%ORG_ID%"
echo %EMPLOYEE_ID% > "%FLEET_DIR%\\%EMPLOYEE_ID%"
exit /b 0`;
}

export function getScriptFilename(os: SupportedOS): string {
  return os === 'macos' ? 'run_me_first.command' : 'run_me_first.bat';
}

export function getPackageFilename(os: SupportedOS): string {
  return os === 'macos' ? 'compai-device-agent.pkg' : 'compai-device-agent.msi';
}

export function getReadmeContent(os: SupportedOS): string {
  if (os === 'macos') {
    return `Installation Instructions for macOS:

1. First, run the setup script by double-clicking "run_me_first.command"
   - This will create the necessary organization markers for device management
   - You may need to allow the script to run in System Preferences > Security & Privacy

2. Then, install the agent by double-clicking "compai-device-agent.pkg"
   - Follow the installation wizard
   - You may need to allow the installer in System Preferences > Security & Privacy

3. The agent will start automatically after installation
`;
  }

  return `Installation Instructions for Windows:

1. First, run the setup script:
   - Right-click on "run_me_first.bat" and select "Run as administrator"
   - This will create the necessary organization markers for device management

2. Then, install the agent:
   - Double-click "compai-device-agent.msi"
   - Follow the installation wizard
   - Windows may show a security warning - click "More info" and then "Run anyway"

3. The agent will start automatically after installation
`;
}
