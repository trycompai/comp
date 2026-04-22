import { describe, it, expect, beforeEach } from 'bun:test';
import { db } from '../client';
import { backfillFrameworkVersions } from './backfill-framework-versions';

describe('backfillFrameworkVersions', () => {
  beforeEach(async () => {
    // Clear FK references before deleting FrameworkVersions
    await db.frameworkInstance.updateMany({ data: { currentVersionId: null } });
    await db.frameworkSyncOperation.deleteMany();
    await db.frameworkVersion.deleteMany();
  });

  it('creates v1.0.0 for every framework without one', async () => {
    const framework = await db.frameworkEditorFramework.findFirst();
    if (!framework) throw new Error('seed data missing');

    const result = await backfillFrameworkVersions();

    expect(result.versionsCreated).toBeGreaterThan(0);
    const v1 = await db.frameworkVersion.findUnique({
      where: { frameworkId_version: { frameworkId: framework.id, version: '1.0.0' } },
    });
    expect(v1).not.toBeNull();
    expect(v1!.manifest).toBeTruthy();
  });

  it('is idempotent — running twice creates no additional versions', async () => {
    await backfillFrameworkVersions();
    const after1 = await db.frameworkVersion.count();
    await backfillFrameworkVersions();
    const after2 = await db.frameworkVersion.count();
    expect(after2).toBe(after1);
  });

  it('backfills FrameworkInstance.currentVersionId', async () => {
    const instance = await db.frameworkInstance.findFirst({ where: { frameworkId: { not: null } } });
    if (!instance) throw new Error('no instance to test against');
    await db.frameworkInstance.update({
      where: { id: instance.id },
      data: { currentVersionId: null },
    });

    await backfillFrameworkVersions();

    const updated = await db.frameworkInstance.findUnique({ where: { id: instance.id } });
    expect(updated!.currentVersionId).not.toBeNull();
  });
});
