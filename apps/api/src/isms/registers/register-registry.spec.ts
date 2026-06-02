import { BadRequestException } from '@nestjs/common';
import type { IsmsContextIssueService } from '../isms-context-issue.service';
import type { IsmsInterestedPartyService } from '../isms-interested-party.service';
import type { IsmsObjectiveService } from '../isms-objective.service';
import type { IsmsRequirementService } from '../isms-requirement.service';
import {
  createRegisterRegistry,
  ISMS_REGISTER_KEYS,
  type RegisterServices,
} from './register-registry';

describe('createRegisterRegistry', () => {
  const contextIssues = { create: jest.fn(), update: jest.fn(), remove: jest.fn() };
  const interestedParties = {
    create: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };
  const requirements = { create: jest.fn(), update: jest.fn(), remove: jest.fn() };
  const objectives = { create: jest.fn(), update: jest.fn(), remove: jest.fn() };

  const services = {
    contextIssues,
    interestedParties,
    requirements,
    objectives,
  } as unknown as RegisterServices;

  const registry = createRegisterRegistry(services);

  beforeEach(() => jest.clearAllMocks());

  it('exposes a handler for every register key', () => {
    expect(Object.keys(registry).sort()).toEqual([...ISMS_REGISTER_KEYS].sort());
  });

  describe('context-issues', () => {
    it('create dispatches with documentId and parsed dto, passing category through', async () => {
      const data = {
        kind: 'internal',
        category: 'Strategic',
        description: 'd',
        effect: 'e',
      };
      await registry['context-issues'].create({
        documentId: 'doc_1',
        organizationId: 'org_1',
        data,
      });
      expect(contextIssues.create).toHaveBeenCalledWith({
        documentId: 'doc_1',
        organizationId: 'org_1',
        dto: data,
      });
    });

    it('update dispatches with issueId', async () => {
      await registry['context-issues'].update({
        rowId: 'row1',
        organizationId: 'org_1',
        data: { description: 'x' },
      });
      expect(contextIssues.update).toHaveBeenCalledWith({
        issueId: 'row1',
        organizationId: 'org_1',
        dto: { description: 'x' },
      });
    });

    it('remove dispatches with issueId', async () => {
      await registry['context-issues'].remove({
        rowId: 'row1',
        organizationId: 'org_1',
      });
      expect(contextIssues.remove).toHaveBeenCalledWith({
        issueId: 'row1',
        organizationId: 'org_1',
      });
    });

    it('create throws BadRequestException when description is missing', () => {
      expect(() =>
        registry['context-issues'].create({
          documentId: 'doc_1',
          organizationId: 'org_1',
          data: { kind: 'internal', effect: 'e' },
        }),
      ).toThrow(BadRequestException);
      expect(contextIssues.create).not.toHaveBeenCalled();
    });
  });

  describe('interested-parties', () => {
    it('create dispatches with documentId and parsed dto', async () => {
      const data = { name: 'Customers', category: 'Customer', needsExpectations: 'n' };
      await registry['interested-parties'].create({
        documentId: 'doc_1',
        organizationId: 'org_1',
        data,
      });
      expect(interestedParties.create).toHaveBeenCalledWith({
        documentId: 'doc_1',
        organizationId: 'org_1',
        dto: data,
      });
    });

    it('update dispatches with partyId', async () => {
      await registry['interested-parties'].update({
        rowId: 'ip_1',
        organizationId: 'org_1',
        data: { name: 'X' },
      });
      expect(interestedParties.update).toHaveBeenCalledWith({
        partyId: 'ip_1',
        organizationId: 'org_1',
        dto: { name: 'X' },
      });
    });

    it('remove dispatches with partyId', async () => {
      await registry['interested-parties'].remove({
        rowId: 'ip_1',
        organizationId: 'org_1',
      });
      expect(interestedParties.remove).toHaveBeenCalledWith({
        partyId: 'ip_1',
        organizationId: 'org_1',
      });
    });
  });

  describe('requirements', () => {
    it('create dispatches with documentId and parsed dto', async () => {
      const data = { partyName: 'C', requirement: 'r', treatment: 't' };
      await registry.requirements.create({
        documentId: 'doc_1',
        organizationId: 'org_1',
        data,
      });
      expect(requirements.create).toHaveBeenCalledWith({
        documentId: 'doc_1',
        organizationId: 'org_1',
        dto: data,
      });
    });

    it('update dispatches with requirementId', async () => {
      await registry.requirements.update({
        rowId: 'req_1',
        organizationId: 'org_1',
        data: { requirement: 'r2' },
      });
      expect(requirements.update).toHaveBeenCalledWith({
        requirementId: 'req_1',
        organizationId: 'org_1',
        dto: { requirement: 'r2' },
      });
    });

    it('remove dispatches with requirementId', async () => {
      await registry.requirements.remove({
        rowId: 'req_1',
        organizationId: 'org_1',
      });
      expect(requirements.remove).toHaveBeenCalledWith({
        requirementId: 'req_1',
        organizationId: 'org_1',
      });
    });
  });

  describe('objectives', () => {
    it('create dispatches with documentId and parsed dto', async () => {
      const data = { objective: 'o' };
      await registry.objectives.create({
        documentId: 'doc_1',
        organizationId: 'org_1',
        data,
      });
      expect(objectives.create).toHaveBeenCalledWith({
        documentId: 'doc_1',
        organizationId: 'org_1',
        dto: data,
      });
    });

    it('update dispatches with objectiveId', async () => {
      await registry.objectives.update({
        rowId: 'obj_1',
        organizationId: 'org_1',
        data: { status: 'met' },
      });
      expect(objectives.update).toHaveBeenCalledWith({
        objectiveId: 'obj_1',
        organizationId: 'org_1',
        dto: { status: 'met' },
      });
    });

    it('remove dispatches with objectiveId', async () => {
      await registry.objectives.remove({
        rowId: 'obj_1',
        organizationId: 'org_1',
      });
      expect(objectives.remove).toHaveBeenCalledWith({
        objectiveId: 'obj_1',
        organizationId: 'org_1',
      });
    });

    it('create throws BadRequestException when status is not in the enum', () => {
      expect(() =>
        registry.objectives.create({
          documentId: 'doc_1',
          organizationId: 'org_1',
          data: { objective: 'o', status: 'bogus' },
        }),
      ).toThrow(BadRequestException);
      expect(objectives.create).not.toHaveBeenCalled();
    });
  });
});
