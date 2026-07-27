jest.mock('@db', () => ({ db: { member: { findFirst: jest.fn() } } }));

import { NotFoundException } from '@nestjs/common';
import { db } from '@db';
import type {
  CheckResultRow,
  CheckResultsService,
} from '../integration-platform/services/check-results.service';
import { PeopleAccessService } from './people-access.service';

const memberFindFirst = db.member.findFirst as jest.Mock;

function row(partial: Partial<CheckResultRow>): CheckResultRow {
  return {
    resultId: 'icr_1',
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
  const service = new PeopleAccessService(checkResults as unknown as CheckResultsService);

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

  it('matches per-user rows by lowercased email and builds display entries', async () => {
    checkResults.getLatestResultsByCheck.mockResolvedValue([
      row({
        resourceType: 'user',
        resourceId: 'jane@x.com',
        description: 'Jane has access to Google Workspace as Super Admin',
        evidence: {
          email: 'jane@x.com',
          name: 'Jane',
          role: 'Super Admin',
          isAdmin: true,
          orgUnit: null,
          checkedAt: '2026-07-01T00:00:00Z',
          roles: ['Super Admin'],
        },
      }),
      row({ resourceType: 'user', resourceId: 'other@x.com' }),
    ]);

    const { sources } = await service.getMemberAccess('org_1', 'mem_1');

    expect(sources).toHaveLength(1);
    expect(sources[0].matchType).toBe('matched');
    expect(sources[0].entries).toHaveLength(1);
    const entry = sources[0].entries[0];
    expect(entry.id).toBe('icr_1');
    expect(entry.summary).toBe('Jane has access to Google Workspace as Super Admin');
    // Primitive evidence values become labeled fields; nulls, arrays, and
    // timestamp keys are excluded; raw evidence is passed through for auditors.
    expect(entry.fields).toEqual({
      Email: 'jane@x.com',
      Name: 'Jane',
      Role: 'Super Admin',
      'Is Admin': 'true',
    });
    expect(entry.raw).toMatchObject({ email: 'jane@x.com' });
  });

  it('reports not-matched when per-user rows exist but none for this member', async () => {
    checkResults.getLatestResultsByCheck.mockResolvedValue([
      row({ resourceType: 'user', resourceId: 'other@x.com' }),
    ]);

    const { sources } = await service.getMemberAccess('org_1', 'mem_1');

    expect(sources[0].matchType).toBe('not-matched');
    expect(sources[0].entries).toHaveLength(0);
  });

  it('reports no-person-data when the check ran but emits no user rows', async () => {
    checkResults.getLatestResultsByCheck.mockResolvedValue([
      row({ resourceType: 'organization', resourceId: 'google-workspace' }),
    ]);

    const { sources } = await service.getMemberAccess('org_1', 'mem_1');

    expect(sources[0].matchType).toBe('no-person-data');
    expect(sources[0].lastCheckedAt).toBe('2026-07-01T00:00:00.000Z');
  });

  it('reports no-data when the check has never really run', async () => {
    checkResults.getLatestResultsByCheck.mockResolvedValue([]);

    const { sources } = await service.getMemberAccess('org_1', 'mem_1');

    expect(sources[0].matchType).toBe('no-data');
    expect(sources[0].lastCheckedAt).toBeNull();
  });

  it('skips sources that are not connected', async () => {
    checkResults.listSourcesBoundToTask.mockResolvedValue([
      SOURCE,
      { ...SOURCE, slug: 'slack', connected: false, connectionId: null },
    ]);
    checkResults.getLatestResultsByCheck.mockResolvedValue([]);

    const { sources } = await service.getMemberAccess('org_1', 'mem_1');

    expect(sources.map((s) => s.slug)).toEqual(['google-workspace']);
    expect(checkResults.getLatestResultsByCheck).toHaveBeenCalledTimes(1);
  });

  it('never matches when the member has no email', async () => {
    memberFindFirst.mockResolvedValue({ id: 'mem_1', user: { email: null } });
    checkResults.getLatestResultsByCheck.mockResolvedValue([
      row({ resourceType: 'user', resourceId: 'jane@x.com' }),
    ]);

    const { sources } = await service.getMemberAccess('org_1', 'mem_1');

    expect(sources[0].matchType).toBe('not-matched');
    expect(sources[0].entries).toHaveLength(0);
  });
});
