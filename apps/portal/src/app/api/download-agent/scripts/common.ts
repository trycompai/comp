import type { SupportedOS } from '../types';

export function getScriptFilename(os: SupportedOS): string {
  return os === 'macos' || os === 'macos-intel' ? 'run_me_first.command' : 'run_me_first.bat';
}

export function getPackageFilename(os: SupportedOS): string {
  return os === 'macos' || os === 'macos-intel'
    ? 'compai-device-agent.pkg'
    : 'compai-device-agent.msi';
}

export function getReadmeContent(os: SupportedOS): string {
  if (os === 'macos' || os === 'macos-intel') {
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
   - Right-click on "run_me_first.bat" and select "Run as administrator" (required)
   - This writes organization markers to the device and registry
   - If prompted by SmartScreen, click "More info" -> "Run anyway"

2. Then, install the agent:
   - Double-click "compai-device-agent.msi" and follow the wizard

3. Troubleshooting:
   - If setup fails, open the log at: %ProgramData%\\CompAI\\Fleet or %Public%\\CompAI\\Fleet -> setup.log
   - Ensure your antivirus or endpoint protection allows running local .bat files
   - If you cannot run as administrator, ask IT to assist or install both files and registry keys manually

4. After installation, the agent will start automatically.
`;
}
