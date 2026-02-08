export type SupportedOS = 'macos' | 'windows' | 'macos-intel' | 'linux';

export interface DownloadAgentRequest {
  orgId: string;
  employeeId: string;
  os?: SupportedOS;
}
