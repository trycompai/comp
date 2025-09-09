import type { ApiOperationOptions } from '@nestjs/swagger';

export const DEVICE_AGENT_OPERATIONS: Record<string, ApiOperationOptions> = {
  downloadMacAgent: {
    summary: 'Download macOS Device Agent',
    description:
      'Downloads the Comp AI Device Agent installer for macOS as a DMG file. The agent helps monitor device compliance and security policies. Supports both API key authentication (X-API-Key header) and session authentication (cookies + X-Organization-Id header).',
  },
  downloadWindowsAgent: {
    summary: 'Download Windows Device Agent ZIP',
    description:
      'Downloads a ZIP package containing the Comp AI Device Agent installer for Windows, along with setup scripts and instructions. The package includes an MSI installer, setup batch script customized for the organization and user, and a README with installation instructions. Supports both API key authentication (X-API-Key header) and session authentication (cookies + X-Organization-Id header).',
  },
};
