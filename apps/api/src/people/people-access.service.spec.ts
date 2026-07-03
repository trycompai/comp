jest.mock('@db', () => ({ db: { member: { findFirst: jest.fn() } } }));

import { NotFoundException } from '@nestjs/common';
import { db } from '@db';
import type {
  CheckResultRow,
  CheckResultsService,
} from '../integration-platform/services/check-results.service';
import type { EvidenceExtractionService } from '../integration-platform/services/evidence-extraction.service';
import { PeopleAccessService } from './people-access.service';

const memberFindFirst = db.member.findFirst as jest.Mock;

function row(partial: Partial<CheckResultRow>): CheckResultRow {
  return {
    resourceId: 'org',
    resourceType: 'organization',
    passed: true,
    title: 'Access List',
    description: null,
    evidence: null,
    collectedAt: new Date('2026-07-01T00:00:00Z'),
    runId: 'run_1',
    connectionId: 'conn_1',
    ...partial,
  };
}

const SOURCE = {
  slug: 'google-workspace',
  name: 'Google Workspace',
  logoUrl: 'https://logo',
  connected: true,
  connectionId: 'conn_1',
  checkId: 'employee-access',
};

describe('PeopleAccessService.getMemberAccess', () => {
  const checkResults = {
    listSourcesBoundToTask: jest.fn(),
    getLatestResultsByCheck: jest.fn(),
  };
  const evidenceExtraction = { extractPersonEntries: jest.fn() };
  const service = new PeopleAccessService(
    checkResults as unknown as CheckResultsService,
    evidenceExtraction as unknown as EvidenceExtractionService,
  );

  beforeEach(() => {
    jest.clearAllMocks();
    memberFindFirst.mockResolvedValue({ id: 'mem_1', user: { email: 'Jane@X.com ' } });
    checkResults.listSourcesBoundToTask.mockResolvedValue([SOURCE]);
  });

  it('404s when the member is not in this organization', async () => {
    memberFindFirst.mockResolvedValue(null);
    await expect(service.getMemberAccess('org_1', 'mem_x')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('maps extraction found -> matched and normalizes the member email', async () => {
    const results = [row({ collectedAt: new Date('2026-07-02T10:00:00Z') })];
    checkResults.getLatestResultsByCheck.mockResolvedValue(results);
    evidenceExtraction.extractPersonEntries.mockResolvedValue({
      status: 'found',
      entries: [{ summary: 'Editor', fields: {}, raw: null, source: 'ai' }],
    });

    const out = await service.getMemberAccess('org_1', 'mem_1');

    expect(evidenceExtraction.extractPersonEntries).toHaveBeenCalledWith(
      expect.objectContaining({ results, email: 'jane@x.com' }),
    );
    expect(out.sources).toEqual([
      expect.objectContaining({
        slug: 'google-workspace',
        matchType: 'matched',
        entries: [expect.objectContaining({ source: 'ai' })],
        lastCheckedAt: '2026-07-02T10:00:00.000Z',
      }),
    ]);
  });

  it('maps extraction not-found -> not-matched and unparsed -> unparsed', async () => {
    checkResults.getLatestResultsByCheck.mockResolvedValue([row({})]);

    evidenceExtraction.extractPersonEntries.mockResolvedValueOnce({
      status: 'not-found',
      entries: [],
    });
    let out = await service.getMemberAccess('org_1', 'mem_1');
    expect(out.sources[0].matchType).toBe('not-matched');

    evidenceExtraction.extractPersonEntries.mockResolvedValueOnce({
      status: 'unparsed',
      entries: [],
    });
    out = await service.getMemberAccess('org_1', 'mem_1');
    expect(out.sources[0].matchType).toBe('unparsed');
  });

  it('reports no-data when the check has never produced results', async () => {
    checkResults.getLatestResultsByCheck.mockResolvedValue([]);
    evidenceExtraction.extractPersonEntries.mockResolvedValue({
      status: 'not-found',
      entries: [],
    });

    const out = await service.getMemberAccess('org_1', 'mem_1');
    expect(out.sources[0]).toMatchObject({ matchType: 'no-data', lastCheckedAt: null });
  });

  it('skips extraction entirely for members without an email', async () => {
    memberFindFirst.mockResolvedValue({ id: 'mem_1', user: { email: null } });
    checkResults.getLatestResultsByCheck.mockResolvedValue([row({})]);

    const out = await service.getMemberAccess('org_1', 'mem_1');

    expect(evidenceExtraction.extractPersonEntries).not.toHaveBeenCalled();
    expect(out.sources[0].matchType).toBe('not-matched');
  });

  it('ignores sources that are not connected', async () => {
    checkResults.listSourcesBoundToTask.mockResolvedValue([
      { ...SOURCE, connected: false, connectionId: null },
    ]);

    const out = await service.getMemberAccess('org_1', 'mem_1');

    expect(out.sources).toEqual([]);
    expect(checkResults.getLatestResultsByCheck).not.toHaveBeenCalled();
  });
});
