export const DEFAULT_RMM_API_BASE_URL = 'https://api.rmm.mspbackups.com';

export const STAT_PATHS: Record<string, string[]> = {
  host: ['/api/v1/computers/stat/host/latest', '/api/v1/computers/stat/host/latest'],
  antivirus: ['/api/v1/computers/stat/antivirus/latest', '/api/v1/computers/stat/antivirus/latest'],
  summary: ['/api/v1/computers/stat/summary/latest', '/api/v1/computers/stat/summary/latest'],
  hardware: ['/api/v1/computers/stat/hardware/latest', '/api/v1/computers/stat/hardware/latest'],
  software: ['/api/v1/computers/stat/software/latest', '/api/v1/computers/stat/software/latest'],
};

export interface RmmPage<T> {
  data?: T[];
  items?: T[];
  results?: T[];
  total?: number;
  Total?: number;
}

export type RmmRecord = Record<string, unknown>;
