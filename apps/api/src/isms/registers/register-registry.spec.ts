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
  const reviews = { create: jest.fn(), update: jest.fn(), remove: jest.fn() };
  const reviewInputs = { create: jest.fn(), update: jest.fn(), remove: jest.fn() };
  const reviewActions = { create: jest.fn(), update: jest.fn(), remove: jest.fn() };

  const services = {
    contextIssues,
    interestedParties,
    requirements,
    objectives,
    reviews,
    reviewInputs,
    reviewActions,
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

    it('update accepts a null interestedPartyId (clearing the link)', async () => {
      await registry.requirements.update({
        rowId: 'req_1',
        organizationId: 'org_1',
        data: { interestedPartyId: null, requirement: 'r2' },
      });
      expect(requirements.update).toHaveBeenCalledWith({
        requirementId: 'req_1',
        organizationId: 'org_1',
        dto: { interestedPartyId: null, requirement: 'r2' },
      });
    });

    it('create accepts a null interestedPartyId', async () => {
      await registry.requirements.create({
        documentId: 'doc_1',
        organizationId: 'org_1',
        data: { partyName: 'C', requirement: 'r', treatment: 't', interestedPartyId: null },
      });
      expect(requirements.create).toHaveBeenCalledWith({
        documentId: 'doc_1',
        organizationId: 'org_1',
        dto: { partyName: 'C', requirement: 'r', treatment: 't', interestedPartyId: null },
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

  describe('reviews (9.3)', () => {
    it('create dispatches with documentId and parsed dto', async () => {
      const data = {
        meetingDate: '2026-05-01',
        chairName: 'Raoul Plickat',
        attendees: [{ memberId: 'mem_1', name: 'Raoul Plickat' }],
      };
      await registry.reviews.create({
        documentId: 'doc_1',
        organizationId: 'org_1',
        data,
      });
      expect(reviews.create).toHaveBeenCalledWith({
        documentId: 'doc_1',
        organizationId: 'org_1',
        dto: data,
      });
    });

    it('update dispatches with reviewId and accepts the review verdict enum', async () => {
      await registry.reviews.update({
        rowId: 'mr_1',
        organizationId: 'org_1',
        data: { status: 'complete', conclusionVerdict: 'effective' },
      });
      expect(reviews.update).toHaveBeenCalledWith({
        reviewId: 'mr_1',
        organizationId: 'org_1',
        dto: { status: 'complete', conclusionVerdict: 'effective' },
      });
    });

    it('create rejects an attendee without a name', () => {
      expect(() =>
        registry.reviews.create({
          documentId: 'doc_1',
          organizationId: 'org_1',
          data: { attendees: [{ memberId: 'mem_1' }] },
        }),
      ).toThrow(BadRequestException);
      expect(reviews.create).not.toHaveBeenCalled();
    });

    it('update rejects an audit verdict on the reviews register', () => {
      expect(() =>
        registry.reviews.update({
          rowId: 'mr_1',
          organizationId: 'org_1',
          data: { conclusionVerdict: 'conform' },
        }),
      ).toThrow(BadRequestException);
      expect(reviews.update).not.toHaveBeenCalled();
    });

    it('remove dispatches with reviewId', async () => {
      await registry.reviews.remove({ rowId: 'mr_1', organizationId: 'org_1' });
      expect(reviews.remove).toHaveBeenCalledWith({
        reviewId: 'mr_1',
        organizationId: 'org_1',
      });
    });
  });

  describe('review-inputs (9.3)', () => {
    it('create requires reviewId and inputRef', () => {
      expect(() =>
        registry['review-inputs'].create({
          documentId: 'doc_1',
          organizationId: 'org_1',
          data: { whatItCovers: 'w' },
        }),
      ).toThrow(BadRequestException);
      expect(reviewInputs.create).not.toHaveBeenCalled();
    });

    it('update dispatches with inputId', async () => {
      await registry['review-inputs'].update({
        rowId: 'mri_1',
        organizationId: 'org_1',
        data: { discussed: true, discussionNotes: 'Covered.' },
      });
      expect(reviewInputs.update).toHaveBeenCalledWith({
        inputId: 'mri_1',
        organizationId: 'org_1',
        dto: { discussed: true, discussionNotes: 'Covered.' },
      });
    });

    it('remove dispatches with inputId', async () => {
      await registry['review-inputs'].remove({
        rowId: 'mri_1',
        organizationId: 'org_1',
      });
      expect(reviewInputs.remove).toHaveBeenCalledWith({
        inputId: 'mri_1',
        organizationId: 'org_1',
      });
    });
  });

  describe('review-actions (9.3)', () => {
    it('create dispatches with documentId and parsed dto', async () => {
      const data = { reviewId: 'mr_1', description: 'Backfill metrics.' };
      await registry['review-actions'].create({
        documentId: 'doc_1',
        organizationId: 'org_1',
        data,
      });
      expect(reviewActions.create).toHaveBeenCalledWith({
        documentId: 'doc_1',
        organizationId: 'org_1',
        dto: data,
      });
    });

    it('create requires a non-empty description', () => {
      expect(() =>
        registry['review-actions'].create({
          documentId: 'doc_1',
          organizationId: 'org_1',
          data: { reviewId: 'mr_1', description: '  ' },
        }),
      ).toThrow(BadRequestException);
      expect(reviewActions.create).not.toHaveBeenCalled();
    });

    it('update dispatches with actionId', async () => {
      await registry['review-actions'].update({
        rowId: 'mra_1',
        organizationId: 'org_1',
        data: { status: 'closed' },
      });
      expect(reviewActions.update).toHaveBeenCalledWith({
        actionId: 'mra_1',
        organizationId: 'org_1',
        dto: { status: 'closed' },
      });
    });

    it('remove dispatches with actionId', async () => {
      await registry['review-actions'].remove({
        rowId: 'mra_1',
        organizationId: 'org_1',
      });
      expect(reviewActions.remove).toHaveBeenCalledWith({
        actionId: 'mra_1',
        organizationId: 'org_1',
      });
    });
  });
});
