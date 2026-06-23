jest.mock('@db', () => ({ db: {}, Prisma: {} }));

const mockGetManifest = jest.fn();
const mockRunAllChecks = jest.fn();
jest.mock('@trycompai/integration-platform', () => ({
  getManifest: (...args: unknown[]) => mockGetManifest(...args),
  runAllChecks: (...args: unknown[]) => mockRunAllChecks(...args),
}));

import {
  CloudSecurityService,
  type SecurityFinding,
} from './cloud-security.service';
import { GCP_SCAN_MODE_DIRECT, GCP_SCAN_MODE_SCC } from './gcp-scan-fallback';

type Ctor = ConstructorParameters<typeof CloudSecurityService>;

interface ScanGcpParams {
  credentials: Record<string, unknown>;
  variables: Record<string, unknown>;
  enabledServices: string[] | undefined;
  connectionId: string;
  organizationId: string;
  providerSlug: string;
}

function callScanGcp(
  service: CloudSecurityService,
  params: ScanGcpParams,
): Promise<{ findings: SecurityFinding[]; scanMode: string }> {
  return (
    service as unknown as {
      scanGcp: (p: ScanGcpParams) => Promise<{
        findings: SecurityFinding[];
        scanMode: string;
      }>;
    }
  ).scanGcp(params);
}

const PARAMS: ScanGcpParams = {
  credentials: { access_token: 'tok' },
  variables: { project_ids: ['p1', 'p2'] },
  enabledServices: undefined,
  connectionId: 'icn_1',
  organizationId: 'org_1',
  providerSlug: 'gcp',
};

const directCheckResult = (
  status: 'success' | 'failed' | 'error',
  error?: string,
) => ({
  durationMs: 1,
  totalFindings: status === 'failed' ? 1 : 0,
  totalPassing: status === 'success' ? 1 : 0,
  results: [
    {
      checkId: 'storage-public-access',
      checkName: 'Storage public access',
      status,
      error,
      durationMs: 1,
      result: {
        logs: [],
        summary: {
          totalChecked: 1,
          passed: status === 'success' ? 1 : 0,
          failed: status === 'failed' ? 1 : 0,
        },
        findings:
          status === 'failed'
            ? [
                {
                  status: 'open' as const,
                  title: 'Bucket publicly accessible: b1',
                  description: 'public',
                  resourceType: 'gcp-storage-bucket',
                  resourceId: 'p1/b1',
                  severity: 'high' as const,
                  remediation: 'fix it',
                  evidence: { bucket: 'b1' },
                },
              ]
            : [],
        passingResults:
          status === 'success'
            ? [
                {
                  collectedAt: new Date(),
                  title: 'Bucket private: b2',
                  description: 'ok',
                  resourceType: 'gcp-storage-bucket',
                  resourceId: 'p1/b2',
                  evidence: { bucket: 'b2' },
                },
              ]
            : [],
      },
    },
  ],
});

describe('CloudSecurityService.scanGcp', () => {
  let gcpService: { scanSecurityFindings: jest.Mock };
  let service: CloudSecurityService;

  beforeEach(() => {
    jest.clearAllMocks();
    gcpService = { scanSecurityFindings: jest.fn() };
    mockGetManifest.mockReturnValue({
      checks: [{ id: 'storage-public-access' }],
    });
    service = new CloudSecurityService(
      {} as unknown as Ctor[0],
      {} as unknown as Ctor[1],
      gcpService as unknown as Ctor[2],
      {} as unknown as Ctor[3],
      {} as unknown as Ctor[4],
      {} as unknown as Ctor[5],
    );
  });

  const sccFinding: SecurityFinding = {
    id: 'scc-1',
    title: 'Public Bucket Acl',
    description: 'x',
    severity: 'high',
    resourceType: 'gcp-resource',
    resourceId: 'r1',
    evidence: { findingKey: 'gcp-cloud-storage-public-bucket-acl' },
    createdAt: new Date().toISOString(),
  };

  it('combines our direct findings with SCC into one list, tagged gcp_scc, when SCC works', async () => {
    mockRunAllChecks.mockResolvedValue(directCheckResult('failed'));
    gcpService.scanSecurityFindings.mockResolvedValue([sccFinding]);

    const result = await callScanGcp(service, PARAMS);

    expect(result.scanMode).toBe(GCP_SCAN_MODE_SCC);
    // One combined list: 1 direct finding + 1 SCC finding (no source split).
    expect(result.findings).toHaveLength(2);
    expect(result.findings.map((f) => f.title)).toEqual(
      expect.arrayContaining([
        'Bucket publicly accessible: b1',
        'Public Bucket Acl',
      ]),
    );
    expect(mockRunAllChecks).toHaveBeenCalledTimes(1);
  });

  it.each([
    'Security Command Center Legacy has been disabled by Google. Please activate the Standard or Premium tier.',
    'SCC_NOT_ACTIVATED: Security Command Center is not activated for project p1.',
    'Permission denied. Grant "Security Center Findings Viewer" role at the organization level.',
  ])(
    'shows direct-API checks only (tagged gcp_direct) when SCC is structurally unavailable: %s',
    async (message) => {
      mockRunAllChecks.mockResolvedValue(directCheckResult('failed'));
      gcpService.scanSecurityFindings.mockRejectedValue(new Error(message));

      const result = await callScanGcp(service, PARAMS);

      expect(result.scanMode).toBe(GCP_SCAN_MODE_DIRECT);
      expect(result.findings).toHaveLength(1);
      expect(result.findings[0]).toMatchObject({
        title: 'Bucket publicly accessible: b1',
        passed: false,
      });
    },
  );

  it('shows direct-API checks only when SCC errors transiently (does not abort)', async () => {
    mockRunAllChecks.mockResolvedValue(directCheckResult('failed'));
    gcpService.scanSecurityFindings.mockRejectedValue(
      new Error('GCP API error (500): internal error'),
    );

    const result = await callScanGcp(service, PARAMS);

    expect(result.scanMode).toBe(GCP_SCAN_MODE_DIRECT);
    expect(result.findings).toHaveLength(1);
  });

  it('throws (preserves prior run) when our OWN checks all error, even if SCC works', async () => {
    mockRunAllChecks.mockResolvedValue(
      directCheckResult('error', 'invalid_grant: token expired'),
    );
    gcpService.scanSecurityFindings.mockResolvedValue([sccFinding]);

    await expect(callScanGcp(service, PARAMS)).rejects.toThrow(
      /GCP direct-API checks all failed/,
    );
  });

  it('returns direct passing findings (clean account) when SCC is unavailable', async () => {
    mockRunAllChecks.mockResolvedValue(directCheckResult('success'));
    gcpService.scanSecurityFindings.mockRejectedValue(
      new Error('Security Command Center Legacy has been disabled by Google.'),
    );

    const result = await callScanGcp(service, PARAMS);

    expect(result.scanMode).toBe(GCP_SCAN_MODE_DIRECT);
    expect(result.findings).toHaveLength(1);
    expect(result.findings[0]).toMatchObject({
      passed: true,
      severity: 'info',
    });
  });
});
