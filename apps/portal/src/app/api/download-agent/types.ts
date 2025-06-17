export type SupportedOS = 'macos' | 'windows';

export interface ScriptConfig {
  orgId: string;
  employeeId: string;
  fleetDevicePath: string;
}

export interface CreateArchiveParams {
  os: SupportedOS;
  script: string;
  tempDir: string;
}

export interface CreateFleetLabelParams {
  employeeId: string;
  memberId: string;
  os: SupportedOS;
  fleetDevicePathMac: string;
  fleetDevicePathWindows: string;
}

export interface DownloadAgentRequest {
  orgId: string;
  employeeId: string;
}

export interface FleetDevicePaths {
  mac: string;
  windows: string;
}
