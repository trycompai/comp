import { BadRequestException } from '@nestjs/common';
import type { AuthContext } from '../auth/types';
import type { FindingsService } from './findings.service';
import { z } from 'zod';

jest.mock('../auth/hybrid-auth.guard', () => ({
  HybridAuthGuard: class HybridAuthGuard {},
}));

jest.mock('../auth/role-validator.guard', () => ({
  RequireRoles: () => () => undefined,
}));

jest.mock('./findings.service', () => ({
  FindingsService: class FindingsService {},
}));

jest.mock(
  '@/evidence-forms/evidence-forms.definitions',
  () => ({
    evidenceFormTypeSchema: z.enum([
      'meeting',
      'access-request',
      'board-meeting',
    ]),
  }),
  { virtual: true },
);

jest.mock('@trycompai/db', () => ({
  FindingType: {
    soc2: 'soc2',
    iso27001: 'iso27001',
  },
  FindingStatus: {
    open: 'open',
    in_progress: 'in_progress',
    resolved: 'resolved',
    dismissed: 'dismissed',
  },
  db: {
    user: {
      findUnique: jest.fn(),
    },
    member: {
      findFirst: jest.fn(),
    },
  },
}));

import { FindingsController } from './findings.controller';

describe('FindingsController', () => {
  const authContext: AuthContext = {
    organizationId: 'org_123',
    authType: 'jwt',
    isApiKey: false,
    userRoles: ['admin'],
    userId: 'usr_123',
    userEmail: 'admin@example.com',
  };

  const findingsServiceMock: Pick<
    FindingsService,
    'findByTaskId' | 'findByEvidenceFormType' | 'findByEvidenceSubmissionId'
  > = {
    findByTaskId: jest.fn(),
    findByEvidenceFormType: jest.fn(),
    findByEvidenceSubmissionId: jest.fn(),
  };

  const controller = new FindingsController(
    findingsServiceMock as FindingsService,
  );

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getFindingsByTask', () => {
    it('returns 400 with friendly message for invalid evidenceFormType', async () => {
      await expect(
        controller.getFindingsByTask(
          '',
          '',
          'not-a-valid-form-type',
          authContext,
        ),
      ).rejects.toThrow(BadRequestException);

      await expect(
        controller.getFindingsByTask(
          '',
          '',
          'not-a-valid-form-type',
          authContext,
        ),
      ).rejects.toThrow('Invalid evidenceFormType value. Must be one of:');
    });

    it('routes valid evidenceFormType through findByEvidenceFormType', async () => {
      await controller.getFindingsByTask('', '', 'meeting', authContext);

      expect(findingsServiceMock.findByEvidenceFormType).toHaveBeenCalledWith(
        authContext.organizationId,
        'meeting',
      );
    });
  });
});
