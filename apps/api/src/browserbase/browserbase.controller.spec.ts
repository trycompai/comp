// apps/api/src/browserbase/browserbase.controller.spec.ts
jest.mock('@db', () => ({
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
  TaskFrequency: {
    daily: 'daily',
    weekly: 'weekly',
    monthly: 'monthly',
    quarterly: 'quarterly',
    yearly: 'yearly',
  },
}));

jest.mock('../auth/auth.server', () => ({
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
import { NotFoundException } from '@nestjs/common';
import type { Response } from 'express';
import { BrowserbaseController } from './browserbase.controller';
import { BrowserbaseService } from './browserbase.service';
import { HybridAuthGuard } from '../auth/hybrid-auth.guard';
import { PermissionGuard } from '../auth/permission.guard';

describe('BrowserbaseController.redirectToScreenshot', () => {
  let controller: BrowserbaseController;
  let service: jest.Mocked<
    Pick<BrowserbaseService, 'getScreenshotRedirectUrl'>
  >;

  beforeEach(async () => {
    service = {
      getScreenshotRedirectUrl: jest.fn(),
    } as jest.Mocked<Pick<BrowserbaseService, 'getScreenshotRedirectUrl'>>;

    const moduleRef = await Test.createTestingModule({
      controllers: [BrowserbaseController],
      providers: [{ provide: BrowserbaseService, useValue: service }],
    })
      .overrideGuard(HybridAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(PermissionGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = moduleRef.get(BrowserbaseController);
  });

  const makeRes = () => {
    const res: Partial<Response> = { redirect: jest.fn() };
    return res as Response & { redirect: jest.Mock };
  };

  it('302-redirects to the freshly minted presigned URL', async () => {
    service.getScreenshotRedirectUrl.mockResolvedValue(
      'https://s3.example.com/fresh-signed',
    );
    const res = makeRes();

    await controller.redirectToScreenshot('bar_1', 'org_1', res);

    expect(service.getScreenshotRedirectUrl).toHaveBeenCalledWith({
      runId: 'bar_1',
      organizationId: 'org_1',
      download: false,
    });
    expect(res.redirect).toHaveBeenCalledWith(
      302,
      'https://s3.example.com/fresh-signed',
    );
  });

  it('passes download=true to the service when the query param is "true"', async () => {
    service.getScreenshotRedirectUrl.mockResolvedValue(
      'https://s3.example.com/fresh-signed-attachment',
    );
    const res = makeRes();

    await controller.redirectToScreenshot('bar_1', 'org_1', res, 'true');

    expect(service.getScreenshotRedirectUrl).toHaveBeenCalledWith({
      runId: 'bar_1',
      organizationId: 'org_1',
      download: true,
    });
  });

  it('propagates NotFoundException when the service throws', async () => {
    service.getScreenshotRedirectUrl.mockRejectedValue(
      new NotFoundException('Screenshot not found'),
    );
    const res = makeRes();

    await expect(
      controller.redirectToScreenshot('bar_missing', 'org_1', res),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(res.redirect).not.toHaveBeenCalled();
  });
});
