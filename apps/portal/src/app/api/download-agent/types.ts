export type SupportedOS = 'macos' | 'windows' | 'macos-intel';

export interface DownloadAgentRequest {
  orgId: string;
  employeeId: string;
  os?: SupportedOS;
}
