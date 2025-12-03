import { Injectable } from '@nestjs/common';
import type { SimilarContentResult } from './lib';
import {
  countEmbeddings,
  deleteManualAnswerFromVector,
  findSimilarContent,
  listManualAnswerEmbeddings,
  syncManualAnswerToVector,
  syncOrganizationEmbeddings,
} from './lib';

@Injectable()
export class VectorStoreService {
  async syncOrganization(organizationId: string): Promise<void> {
    await syncOrganizationEmbeddings(organizationId);
  }

  async syncManualAnswer(manualAnswerId: string, organizationId: string) {
    return syncManualAnswerToVector(manualAnswerId, organizationId);
  }

  async deleteManualAnswer(manualAnswerId: string, organizationId: string) {
    return deleteManualAnswerFromVector(manualAnswerId, organizationId);
  }

  async searchSimilarContent(
    question: string,
    organizationId: string,
  ): Promise<SimilarContentResult[]> {
    return findSimilarContent(question, organizationId);
  }

  async countOrganizationEmbeddings(
    organizationId: string,
    sourceType?: 'policy' | 'context' | 'manual_answer',
  ) {
    return countEmbeddings(organizationId, sourceType);
  }

  async listManualAnswers(organizationId: string) {
    return listManualAnswerEmbeddings(organizationId);
  }
}
