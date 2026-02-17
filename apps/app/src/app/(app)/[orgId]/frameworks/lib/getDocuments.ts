import { cache } from 'react';
import {
  computeDocumentsProgress,
  getDocumentFormStatusesForOrganization,
} from './taskEvidenceDocumentsScore';

export const getDocumentsScore = cache(async (organizationId: string) => {
  const statuses = await getDocumentFormStatusesForOrganization(organizationId);
  const { totalDocuments, completedDocuments, outstandingDocuments } =
    computeDocumentsProgress(statuses);

  return {
    totalDocuments,
    completedDocuments,
    outstandingDocuments,
  };
});
