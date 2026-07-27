// AzureSecurityService scans Defender + a suite of ARM service adapters, all of
// which go through the global `fetch`. These tests mock `fetch` to exercise the
// all-units-failed guard: a scan where every unit errors must THROW (so it is
// not stored as a fresh empty "success" run that hides the prior good results),
// while a genuinely-clean subscription (everything succeeds, 0 findings) must
// return [] without throwing.
jest.mock('@db', () => ({ db: {} }));

import { AzureSecurityService } from './azure-security.service';

function azureOkEmpty(): { ok: true; json: () => Promise<unknown> } {
  return { ok: true, json: async () => ({ value: [] }) };
}

function azureError(
  status: number,
  text = 'error',
): { ok: false; status: number; text: () => Promise<string> } {
  return { ok: false, status, text: async () => text };
}

describe('AzureSecurityService.scanSecurityFindings — all-units-failed guard', () => {
  let service: AzureSecurityService;
  let fetchMock: jest.Mock;
  const originalFetch = global.fetch;

  const creds = { access_token: 'tok' };
  const vars = { subscription_id: 'sub-1' };

  beforeEach(() => {
    fetchMock = jest.fn();
    // @ts-expect-error replacing global fetch with a mock for these tests
    global.fetch = fetchMock;
    service = new AzureSecurityService();
  });

  afterAll(() => {
    global.fetch = originalFetch;
  });

  // The bug: a total (non-403) failure used to return [] silently, which got
  // stored as a fresh "success" run with 0 findings and hid the prior results.
  it('throws when the whole scan errors out and produces no findings, instead of returning []', async () => {
    fetchMock.mockResolvedValue(azureError(500, 'internal server error'));

    await expect(service.scanSecurityFindings(creds, vars)).rejects.toThrow();
  });

  it('does NOT throw on a healthy subscription — adapters emit passing findings', async () => {
    fetchMock.mockResolvedValue(azureOkEmpty());

    const findings = await service.scanSecurityFindings(creds, vars);
    expect(findings.length).toBeGreaterThan(0);
  });

  it('does NOT throw when results are produced even though one adapter fails', async () => {
    fetchMock.mockImplementation(async (url: string) => {
      // Storage adapter fails; everything else succeeds (and emits findings).
      if (url.includes('Microsoft.Storage')) return azureError(500, 'boom');
      return azureOkEmpty();
    });

    const findings = await service.scanSecurityFindings(creds, vars);
    expect(findings.length).toBeGreaterThan(0);
  });

  it('still enforces required inputs (missing subscription throws AZURE_SUB_MISSING)', async () => {
    await expect(service.scanSecurityFindings(creds, {})).rejects.toThrow(
      /AZURE_SUB_MISSING/,
    );
  });
});
