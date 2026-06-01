// Mocks must be declared before any SUT import so guards' transitive deps
// (Prisma, better-auth) don't instantiate in Jest.
jest.mock('@db', () => ({
  ...jest.requireActual('@prisma/client'),
  db: {},
  Prisma: {
    PrismaClientKnownRequestError: class PrismaClientKnownRequestError extends Error {
      code: string;
      constructor(message: string, { code }: { code: string }) {
        super(message);
        this.code = code;
      }
    },
  },
}));

jest.mock('../../auth/auth.server', () => ({
  auth: {
    api: {
      getSession: jest.fn(),
    },
  },
}));

jest.mock('@trycompai/auth', () => ({
  statement: {},
  BUILT_IN_ROLE_PERMISSIONS: {},
}));

import { Test } from '@nestjs/testing';
import { EventEmitter } from 'node:events';
import { HybridAuthGuard } from '../../auth/hybrid-auth.guard';
import { PermissionGuard } from '../../auth/permission.guard';
import {
  AuditorEvidenceExportController,
  EvidenceExportController,
} from './evidence-export.controller';
import { EvidenceExportService } from './evidence-export.service';
import { TasksService } from '../tasks.service';

function makeFakeArchive() {
  const emitter = new EventEmitter();
  const archive = Object.assign(emitter, {
    pipe: jest.fn(),
    append: jest.fn(),
    finalize: jest.fn(),
    abort: jest.fn(),
  });
  return archive;
}

function makeFakeResponse() {
  const emitter = new EventEmitter();
  const res = Object.assign(emitter, {
    setHeader: jest.fn(),
    flushHeaders: jest.fn(),
    status: jest.fn(function (this: unknown) {
      return res;
    }),
    end: jest.fn(),
    headersSent: false,
    writableEnded: false,
    writableFinished: false,
  });
  return res;
}

function makeFakeRequest() {
  return new EventEmitter();
}

describe('EvidenceExportController', () => {
  let controller: EvidenceExportController;
  let service: jest.Mocked<
    Pick<
      EvidenceExportService,
      'streamTaskEvidenceZip' | 'exportAutomationPDF' | 'getTaskEvidenceSummary'
    >
  >;
  let tasks: jest.Mocked<Pick<TasksService, 'verifyTaskAccess'>>;

  beforeEach(async () => {
    service = {
      streamTaskEvidenceZip: jest.fn(),
      exportAutomationPDF: jest.fn(),
      getTaskEvidenceSummary: jest.fn(),
    };
    tasks = {
      verifyTaskAccess: jest.fn().mockResolvedValue(undefined),
    };

    const moduleRef = await Test.createTestingModule({
      controllers: [EvidenceExportController],
      providers: [
        { provide: EvidenceExportService, useValue: service },
        { provide: TasksService, useValue: tasks },
      ],
    })
      .overrideGuard(HybridAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(PermissionGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = moduleRef.get(EvidenceExportController);
  });

  it('verifies task access, sets zip headers, and pipes archive to response', async () => {
    const archive = makeFakeArchive();
    service.streamTaskEvidenceZip.mockResolvedValue({
      archive: archive as unknown as import('archiver').Archiver,
      filename: 'acme_mytask_evidence_2026-04-22.zip',
    });
    const req = makeFakeRequest();
    const res = makeFakeResponse();

    await controller.exportTaskEvidenceZip(
      'org_1',
      'tsk_1',
      'true',
      req as unknown as import('express').Request,
      res as unknown as import('express').Response,
    );

    expect(tasks.verifyTaskAccess).toHaveBeenCalledWith('org_1', 'tsk_1');
    expect(service.streamTaskEvidenceZip).toHaveBeenCalledWith(
      'org_1',
      'tsk_1',
      { includeRawJson: true },
    );
    expect(res.setHeader).toHaveBeenCalledWith(
      'Content-Type',
      'application/zip',
    );
    expect(res.setHeader).toHaveBeenCalledWith(
      'Content-Disposition',
      `attachment; filename="acme_mytask_evidence_2026-04-22.zip"`,
    );
    expect(res.flushHeaders).toHaveBeenCalledTimes(1);
    expect(archive.pipe).toHaveBeenCalledWith(res);
  });

  it('treats missing includeJson query as false', async () => {
    const archive = makeFakeArchive();
    service.streamTaskEvidenceZip.mockResolvedValue({
      archive: archive as unknown as import('archiver').Archiver,
      filename: 'f.zip',
    });
    const req = makeFakeRequest();
    const res = makeFakeResponse();

    await controller.exportTaskEvidenceZip(
      'org_1',
      'tsk_1',
      undefined as unknown as string,
      req as unknown as import('express').Request,
      res as unknown as import('express').Response,
    );

    expect(service.streamTaskEvidenceZip).toHaveBeenCalledWith(
      'org_1',
      'tsk_1',
      { includeRawJson: false },
    );
  });

  it('aborts the archive when the client disconnects mid-stream', async () => {
    const archive = makeFakeArchive();
    service.streamTaskEvidenceZip.mockResolvedValue({
      archive: archive as unknown as import('archiver').Archiver,
      filename: 'f.zip',
    });
    const req = makeFakeRequest();
    const res = makeFakeResponse();

    await controller.exportTaskEvidenceZip(
      'org_1',
      'tsk_1',
      'false',
      req as unknown as import('express').Request,
      res as unknown as import('express').Response,
    );

    expect(archive.abort).not.toHaveBeenCalled();

    // Simulate a client-side disconnect: res emits 'close' before the response
    // has fully flushed (writableFinished is still false).
    res.writableFinished = false;
    res.emit('close');

    expect(archive.abort).toHaveBeenCalledTimes(1);
  });

  it('does NOT abort the archive when the response completed normally', async () => {
    // Regression guard for cubic P1: with req.once('close') this would falsely
    // abort on Node 16+. Using res.close + writableFinished avoids that.
    const archive = makeFakeArchive();
    service.streamTaskEvidenceZip.mockResolvedValue({
      archive: archive as unknown as import('archiver').Archiver,
      filename: 'f.zip',
    });
    const req = makeFakeRequest();
    const res = makeFakeResponse();

    await controller.exportTaskEvidenceZip(
      'org_1',
      'tsk_1',
      'false',
      req as unknown as import('express').Request,
      res as unknown as import('express').Response,
    );

    // Successful flow: archiver finishes, writableFinished becomes true before
    // 'close' fires on the response.
    res.writableFinished = true;
    res.emit('close');

    // And even if req 'close' fires too (Node 16+ does this on normal
    // completion), we ignore it — no listener attached there.
    req.emit('close');

    expect(archive.abort).not.toHaveBeenCalled();
  });
});

describe('AuditorEvidenceExportController', () => {
  let controller: AuditorEvidenceExportController;
  let service: jest.Mocked<
    Pick<EvidenceExportService, 'streamOrganizationEvidenceZip'>
  >;

  beforeEach(async () => {
    service = {
      streamOrganizationEvidenceZip: jest.fn(),
    };

    const moduleRef = await Test.createTestingModule({
      controllers: [AuditorEvidenceExportController],
      providers: [{ provide: EvidenceExportService, useValue: service }],
    })
      .overrideGuard(HybridAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(PermissionGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = moduleRef.get(AuditorEvidenceExportController);
  });

  it('pipes the org-wide archive to response with correct headers', async () => {
    const archive = makeFakeArchive();
    service.streamOrganizationEvidenceZip.mockResolvedValue({
      archive: archive as unknown as import('archiver').Archiver,
      filename: 'acme_all-evidence_2026-04-22.zip',
    });
    const req = makeFakeRequest();
    const res = makeFakeResponse();

    await controller.exportAllEvidence(
      'org_1',
      'true',
      req as unknown as import('express').Request,
      res as unknown as import('express').Response,
    );

    expect(service.streamOrganizationEvidenceZip).toHaveBeenCalledWith(
      'org_1',
      { includeRawJson: true },
    );
    expect(res.setHeader).toHaveBeenCalledWith(
      'Content-Type',
      'application/zip',
    );
    expect(res.setHeader).toHaveBeenCalledWith(
      'Content-Disposition',
      `attachment; filename="acme_all-evidence_2026-04-22.zip"`,
    );
    expect(res.flushHeaders).toHaveBeenCalledTimes(1);
    expect(archive.pipe).toHaveBeenCalledWith(res);
  });
});
