import { db } from '@db';
import { batchUpsertEmbeddings } from '../core/upsert-embedding';
import { chunkText } from '../utils/chunk-text';
import { extractTextFromPolicy } from '../utils/extract-policy-text';
import { deleteOrganizationEmbeddings } from '../core/delete-embeddings';
import { findAllOrganizationEmbeddings, type ExistingEmbedding } from '../core/find-existing-embeddings';
import { findEmbeddingsForSource } from '../core/find-existing-embeddings';
import { vectorIndex } from '../core/client';
import { logger } from '../../logger';
import { GetObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { extractContentFromFile } from '@/vector-store/jobs/helpers/extract-content-from-file';

/**
 * Lock map to prevent concurrent syncs for the same organization
 * Key: organizationId, Value: Promise that resolves when sync completes
 */
const syncLocks = new Map<string, Promise<void>>();

/**
 * Creates an S3 client instance for Knowledge Base document processing
 */
function createKnowledgeBaseS3Client(): S3Client {
  const region = process.env.APP_AWS_REGION || 'us-east-1';
  const accessKeyId = process.env.APP_AWS_ACCESS_KEY_ID;
  const secretAccessKey = process.env.APP_AWS_SECRET_ACCESS_KEY;

  if (!accessKeyId || !secretAccessKey) {
    throw new Error(
      'AWS S3 credentials are missing. Please set APP_AWS_ACCESS_KEY_ID and APP_AWS_SECRET_ACCESS_KEY environment variables.',
    );
  }

  return new S3Client({
    region,
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
  });
}

/**
 * Extracts content from a Knowledge Base document stored in S3 synchronously
 */
async function extractContentFromKnowledgeBaseDocument(
  s3Key: string,
  fileType: string,
): Promise<string> {
  const knowledgeBaseBucket = process.env.APP_AWS_KNOWLEDGE_BASE_BUCKET;
  
  if (!knowledgeBaseBucket) {
    throw new Error('Knowledge base bucket is not configured. Please set APP_AWS_KNOWLEDGE_BASE_BUCKET environment variable.');
  }

  const s3Client = createKnowledgeBaseS3Client();

  const getCommand = new GetObjectCommand({
    Bucket: knowledgeBaseBucket,
    Key: s3Key,
  });
  
  const response = await s3Client.send(getCommand);
  
  if (!response.Body) {
    throw new Error('Failed to retrieve file from S3');
  }
  
  // Convert stream to buffer
  const chunks: Uint8Array[] = [];
  for await (const chunk of response.Body as any) {
    chunks.push(chunk);
  }
  const buffer = Buffer.concat(chunks);
  const base64Data = buffer.toString('base64');
  
  // Use provided fileType or determine from content type
  const detectedFileType = response.ContentType || fileType || 'application/octet-stream';
  
  const content = await extractContentFromFile(base64Data, detectedFileType);
  
  return content;
}

/**
 * Full resync of organization embeddings: deletes all old embeddings and creates new ones
 * Simple approach that guarantees data freshness
 * Optimized for small to medium volumes (100-200 policies)
 * 
 * Uses a lock mechanism to prevent concurrent syncs for the same organization.
 * If a sync is already in progress, subsequent calls will wait for it to complete.
 */
export async function syncOrganizationEmbeddings(organizationId: string): Promise<void> {
  if (!organizationId || organizationId.trim().length === 0) {
    logger.warn('Invalid organizationId provided for sync');
    return;
  }

  // Check if sync is already in progress for this organization
  const existingSync = syncLocks.get(organizationId);
  if (existingSync) {
    logger.info('Sync already in progress, waiting for completion', { organizationId });
    return existingSync;
  }

  // Create new sync promise
  const syncPromise = performSync(organizationId);

  // Store the promise in the lock map
  syncLocks.set(organizationId, syncPromise);

  // Clean up lock when sync completes (success or failure)
  syncPromise
    .finally(() => {
      syncLocks.delete(organizationId);
      logger.info('Sync lock released', { organizationId });
    })
    .catch(() => {
      // Error already logged in performSync, just ensure cleanup happens
    });

  return syncPromise;
}

/**
 * Internal function that performs the actual sync operation
 * Uses incremental sync: only updates what changed
 */
async function performSync(organizationId: string): Promise<void> {
  logger.info('Starting incremental organization embeddings sync', { organizationId });

  try {
    // Step 1: Fetch all existing embeddings once (respects 1000 limit)
    // This is much faster than checking each policy/context individually
    const existingEmbeddings = await findAllOrganizationEmbeddings(organizationId);
    logger.info('Fetched existing embeddings', {
      organizationId,
      totalSources: existingEmbeddings.size,
    });

    // Step 2: Get all published policies with updatedAt (NO LIMITS)
    const policies = await db.policy.findMany({
      where: {
        organizationId,
        status: 'published', // Only published policies
      },
      select: {
        id: true,
        name: true,
        description: true,
        content: true,
        organizationId: true,
        updatedAt: true, // Include updatedAt for comparison
      },
      // NO take: 10 - get ALL policies
    });

    logger.info('Found policies to sync', {
      organizationId,
      count: policies.length,
    });

    // Step 3: Sync policies incrementally in parallel batches
    let policiesCreated = 0;
    let policiesUpdated = 0;
    let policiesSkipped = 0;

    // Process policies in parallel batches for better performance
    const POLICY_BATCH_SIZE = 100; // Process 100 policies in parallel (increased from 10 for better performance)
    
    for (let i = 0; i < policies.length; i += POLICY_BATCH_SIZE) {
      const batch = policies.slice(i, i + POLICY_BATCH_SIZE);
      
      // Process batch in parallel
      await Promise.all(
        batch.map(async (policy) => {
          try {
            // Get embeddings from our pre-fetched map (fast - no API call)
            const policyEmbeddings = existingEmbeddings.get(policy.id) || [];
            const policyUpdatedAt = policy.updatedAt.toISOString();
            
            // Check if policy needs update
            const needsUpdate = policyEmbeddings.length === 0 || 
              policyEmbeddings.some((e: ExistingEmbedding) => !e.updatedAt || e.updatedAt < policyUpdatedAt);

            if (!needsUpdate) {
              policiesSkipped++;
              return; // Skip - already up to date
            }

            // Delete old embeddings if they exist
            if (policyEmbeddings.length > 0 && vectorIndex) {
              const idsToDelete = policyEmbeddings.map((e: ExistingEmbedding) => e.id);
              try {
                await vectorIndex.delete(idsToDelete);
              } catch (error) {
                logger.warn('Failed to delete old policy embeddings', {
                  policyId: policy.id,
                  error: error instanceof Error ? error.message : 'Unknown error',
                });
              }
            }

            // Create new embeddings
            const policyText = extractTextFromPolicy(policy as any);
            
            if (!policyText || policyText.trim().length === 0) {
              return; // Skip empty policy
            }

            const chunks = chunkText(policyText, 500, 50);
            
            if (chunks.length === 0) {
              return; // Skip if no chunks
            }

            // Batch process chunks: generate embeddings in parallel, then upsert in parallel
            const chunkItems = chunks
              .map((chunk, chunkIndex) => ({
                id: `policy_${policy.id}_chunk${chunkIndex}`,
                text: chunk,
                metadata: {
                  organizationId,
                  sourceType: 'policy' as const,
                  sourceId: policy.id,
                  content: chunk,
                  policyName: policy.name,
                  updatedAt: policyUpdatedAt,
                },
              }))
              .filter((item) => item.text && item.text.trim().length > 0);

            if (chunkItems.length > 0) {
              await batchUpsertEmbeddings(chunkItems);
            }

            if (policyEmbeddings.length === 0) {
              policiesCreated++;
            } else {
              policiesUpdated++;
            }
          } catch (error) {
            logger.error('Failed to sync policy', {
              policyId: policy.id,
              error: error instanceof Error ? error.message : 'Unknown error',
            });
            // Continue with other policies
          }
        })
      );
    }

    logger.info('Policies sync completed', {
      organizationId,
      created: policiesCreated,
      updated: policiesUpdated,
      skipped: policiesSkipped,
      total: policies.length,
    });

    // Step 4: Get all context entries with updatedAt (NO LIMITS)
    const contextEntries = await db.context.findMany({
      where: { organizationId },
      select: {
        id: true,
        question: true,
        answer: true,
        organizationId: true,
        updatedAt: true, // Include updatedAt for comparison
      },
      // NO take: 10 - get ALL context entries
    });

    logger.info('Found context entries to sync', {
      organizationId,
      count: contextEntries.length,
    });

    // Step 5: Sync context entries incrementally in parallel batches
    let contextCreated = 0;
    let contextUpdated = 0;
    let contextSkipped = 0;

    // Process context entries in parallel batches for better performance
    const CONTEXT_BATCH_SIZE = 100; // Process 100 context entries in parallel (increased from 10 for better performance)
    
    for (let i = 0; i < contextEntries.length; i += CONTEXT_BATCH_SIZE) {
      const batch = contextEntries.slice(i, i + CONTEXT_BATCH_SIZE);
      
      // Process batch in parallel
      await Promise.all(
        batch.map(async (context) => {
          try {
            // Get embeddings from our pre-fetched map (fast - no API call)
            const contextEmbeddings = existingEmbeddings.get(context.id) || [];
            const contextUpdatedAt = context.updatedAt.toISOString();
            
            // Check if context needs update
            const needsUpdate = contextEmbeddings.length === 0 || 
              contextEmbeddings.some((e: ExistingEmbedding) => !e.updatedAt || e.updatedAt < contextUpdatedAt);

            if (!needsUpdate) {
              contextSkipped++;
              return; // Skip - already up to date
            }

            // Delete old embeddings if they exist
            if (contextEmbeddings.length > 0 && vectorIndex) {
              const idsToDelete = contextEmbeddings.map((e: ExistingEmbedding) => e.id);
              try {
                await vectorIndex.delete(idsToDelete);
              } catch (error) {
                logger.warn('Failed to delete old context embeddings', {
                  contextId: context.id,
                  error: error instanceof Error ? error.message : 'Unknown error',
                });
              }
            }

            // Create new embeddings
            const contextText = `Question: ${context.question}\n\nAnswer: ${context.answer}`;
            
            if (!contextText || contextText.trim().length === 0) {
              return; // Skip empty context
            }

            const chunks = chunkText(contextText, 8000, 50);
            
            if (chunks.length === 0) {
              return; // Skip if no chunks
            }

            // Batch process chunks: generate embeddings in parallel, then upsert in parallel
            const chunkItems = chunks
              .map((chunk, chunkIndex) => ({
                id: `context_${context.id}_chunk${chunkIndex}`,
                text: chunk,
                metadata: {
                  organizationId,
                  sourceType: 'context' as const,
                  sourceId: context.id,
                  content: chunk,
                  contextQuestion: context.question,
                  updatedAt: contextUpdatedAt,
                },
              }))
              .filter((item) => item.text && item.text.trim().length > 0);

            if (chunkItems.length > 0) {
              await batchUpsertEmbeddings(chunkItems);
            }

            if (contextEmbeddings.length === 0) {
              contextCreated++;
            } else {
              contextUpdated++;
            }
          } catch (error) {
            logger.error('Failed to sync context', {
              contextId: context.id,
              error: error instanceof Error ? error.message : 'Unknown error',
            });
            // Continue with other context entries
          }
        })
      );
    }

    logger.info('Context sync completed', {
      organizationId,
      created: contextCreated,
      updated: contextUpdated,
      skipped: contextSkipped,
      total: contextEntries.length,
    });

    // Step 6: Sync manual answers (ensure they're always up-to-date)
    const manualAnswers = await db.securityQuestionnaireManualAnswer.findMany({
      where: { organizationId },
      select: {
        id: true,
        question: true,
        answer: true,
        updatedAt: true,
      },
    });

    logger.info('Syncing manual answers', {
      organizationId,
      count: manualAnswers.length,
    });

    let manualAnswersCreated = 0;
    let manualAnswersUpdated = 0;
    let manualAnswersSkipped = 0;

    if (manualAnswers.length > 0) {
      const manualAnswerItems = manualAnswers
        .map((ma) => {
          const embeddingId = `manual_answer_${ma.id}`;
          const text = `${ma.question}\n\n${ma.answer}`;
          const updatedAt = ma.updatedAt.toISOString();
          
          // Check if embedding exists and needs update
          const existingManualAnswerEmbeddings = existingEmbeddings.get(ma.id) || [];
          const needsUpdate = existingManualAnswerEmbeddings.length === 0 || 
            existingManualAnswerEmbeddings[0]?.updatedAt !== updatedAt;

          if (!needsUpdate) {
            manualAnswersSkipped++;
            return null; // Skip - already up to date
          }

          // Update counters for items that need updating
          if (existingManualAnswerEmbeddings.length === 0) {
            manualAnswersCreated++;
          } else {
            manualAnswersUpdated++;
          }

          return {
            id: embeddingId,
            text,
            metadata: {
              organizationId,
              sourceType: 'manual_answer' as const,
              sourceId: ma.id,
              content: text,
              manualAnswerQuestion: ma.question, // Store question for source identification
              updatedAt,
            },
          };
        })
        .filter((item): item is NonNullable<typeof item> => item !== null);

      // Batch upsert only manual answers that need updating
      if (manualAnswerItems.length > 0) {
        await batchUpsertEmbeddings(manualAnswerItems);
      }
    }

    logger.info('Manual answers sync completed', {
      organizationId,
      created: manualAnswersCreated,
      updated: manualAnswersUpdated,
      skipped: manualAnswersSkipped,
      total: manualAnswers.length,
    });

    // Step 7: Sync Knowledge Base documents
    // Process documents synchronously to ensure embeddings are ready before answer generation
    const knowledgeBaseDocuments = await db.knowledgeBaseDocument.findMany({
      where: { organizationId },
      select: {
        id: true,
        name: true,
        s3Key: true,
        fileType: true,
        processingStatus: true,
        updatedAt: true,
      },
    });

    logger.info('Found Knowledge Base documents to sync', {
      organizationId,
      count: knowledgeBaseDocuments.length,
    });

    let documentsProcessed = 0;
    let documentsSkipped = 0;
    let documentsFailed = 0;

    // Filter documents that need processing
    const documentsToProcess = knowledgeBaseDocuments.filter((document) => {
      const documentEmbeddings = existingEmbeddings.get(document.id) || [];
      const documentUpdatedAt = document.updatedAt.toISOString();
      
      return document.processingStatus === 'pending' || 
             document.processingStatus === 'failed' ||
             documentEmbeddings.length === 0 || 
             documentEmbeddings.some((e: ExistingEmbedding) => !e.updatedAt || e.updatedAt < documentUpdatedAt);
    });

    documentsSkipped = knowledgeBaseDocuments.length - documentsToProcess.length;

    // Process documents in parallel batches for better performance
    // Use smaller batch size (10) for Knowledge Base documents since they involve S3 downloads and content extraction
    const DOCUMENT_BATCH_SIZE = 20;
    
    for (let i = 0; i < documentsToProcess.length; i += DOCUMENT_BATCH_SIZE) {
      const batch = documentsToProcess.slice(i, i + DOCUMENT_BATCH_SIZE);
      
      // Process batch in parallel
      await Promise.all(
        batch.map(async (document) => {
          try {
            const documentUpdatedAt = document.updatedAt.toISOString();

            // Process document synchronously
            logger.info('Processing Knowledge Base document', {
              documentId: document.id,
              organizationId,
              s3Key: document.s3Key,
            });

            // Update status to processing
            await db.knowledgeBaseDocument.update({
              where: { id: document.id },
              data: { processingStatus: 'processing' },
            });

            // Extract content from S3
            const content = await extractContentFromKnowledgeBaseDocument(
              document.s3Key,
              document.fileType,
            );

            if (!content || content.trim().length === 0) {
              logger.warn('No content extracted from document', {
                documentId: document.id,
              });
              await db.knowledgeBaseDocument.update({
                where: { id: document.id },
                data: {
                  processingStatus: 'failed',
                  processedAt: new Date(),
                },
              });
              documentsFailed++;
              return;
            }

            // Delete existing embeddings if any
            const existingDocEmbeddings = await findEmbeddingsForSource(
              document.id,
              'knowledge_base_document',
              organizationId,
            );

            if (existingDocEmbeddings.length > 0 && vectorIndex) {
              const idsToDelete = existingDocEmbeddings.map((e) => e.id);
              try {
                await vectorIndex.delete(idsToDelete);
                logger.info('Deleted existing embeddings', {
                  documentId: document.id,
                  deletedCount: idsToDelete.length,
                });
              } catch (error) {
                logger.warn('Failed to delete existing embeddings', {
                  documentId: document.id,
                  error: error instanceof Error ? error.message : 'Unknown error',
                });
              }
            }

            // Chunk content and create embeddings
            const chunks = chunkText(content, 500, 50);

            if (chunks.length === 0) {
              logger.warn('No chunks created from content', {
                documentId: document.id,
              });
              await db.knowledgeBaseDocument.update({
                where: { id: document.id },
                data: {
                  processingStatus: 'failed',
                  processedAt: new Date(),
                },
              });
              documentsFailed++;
              return;
            }

            const chunkItems = chunks
              .map((chunk, chunkIndex) => ({
                id: `knowledge_base_document_${document.id}_chunk${chunkIndex}`,
                text: chunk,
                metadata: {
                  organizationId,
                  sourceType: 'knowledge_base_document' as const,
                  sourceId: document.id,
                  content: chunk,
                  documentName: document.name,
                  updatedAt: documentUpdatedAt,
                },
              }))
              .filter((item) => item.text && item.text.trim().length > 0);

            if (chunkItems.length > 0) {
              await batchUpsertEmbeddings(chunkItems);
              logger.info('Successfully created embeddings', {
                documentId: document.id,
                embeddingCount: chunkItems.length,
              });
            }

            // Update status to completed
            await db.knowledgeBaseDocument.update({
              where: { id: document.id },
              data: {
                processingStatus: 'completed',
                processedAt: new Date(),
              },
            });

            documentsProcessed++;
          } catch (error) {
            logger.error('Failed to process Knowledge Base document', {
              documentId: document.id,
              error: error instanceof Error ? error.message : 'Unknown error',
              errorStack: error instanceof Error ? error.stack : undefined,
            });

            // Update status to failed
            try {
              await db.knowledgeBaseDocument.update({
                where: { id: document.id },
                data: {
                  processingStatus: 'failed',
                  processedAt: new Date(),
                },
              });
            } catch (updateError) {
              logger.error('Failed to update document status to failed', {
                documentId: document.id,
                error: updateError instanceof Error ? updateError.message : 'Unknown error',
              });
            }

            documentsFailed++;
          }
        }),
      );
    }

    logger.info('Knowledge Base documents sync completed', {
      organizationId,
      processed: documentsProcessed,
      skipped: documentsSkipped,
      failed: documentsFailed,
      total: knowledgeBaseDocuments.length,
    });

    // Step 8: Delete orphaned embeddings (policies/context/manual_answers/knowledge_base_documents that no longer exist in DB)
    // Use the embeddings we already fetched (no additional API call needed)
    const dbPolicyIds = new Set(policies.map(p => p.id));
    const dbContextIds = new Set(contextEntries.map(c => c.id));
    const dbManualAnswerIds = new Set(manualAnswers.map(ma => ma.id));
    const dbKnowledgeBaseDocumentIds = new Set(knowledgeBaseDocuments.map(d => d.id));
    let orphanedDeleted = 0;

    // Check for orphaned embeddings using the pre-fetched map
    try {
      for (const [sourceId, embeddings] of existingEmbeddings.entries()) {
        const isPolicy = embeddings[0]?.sourceType === 'policy';
        const isContext = embeddings[0]?.sourceType === 'context';
        const isManualAnswer = embeddings[0]?.sourceType === 'manual_answer';
        const isKnowledgeBaseDocument = embeddings[0]?.sourceType === 'knowledge_base_document';
        
        const shouldExist = (isPolicy && dbPolicyIds.has(sourceId)) || 
                            (isContext && dbContextIds.has(sourceId)) ||
                            (isManualAnswer && dbManualAnswerIds.has(sourceId)) ||
                            (isKnowledgeBaseDocument && dbKnowledgeBaseDocumentIds.has(sourceId));

        if (!shouldExist && vectorIndex) {
          // Delete orphaned embeddings
          const idsToDelete = embeddings.map((e: ExistingEmbedding) => e.id);
          try {
            await vectorIndex.delete(idsToDelete);
            orphanedDeleted += idsToDelete.length;
            logger.info('Deleted orphaned embeddings', {
              sourceId,
              sourceType: isPolicy ? 'policy' : isContext ? 'context' : isManualAnswer ? 'manual_answer' : 'knowledge_base_document',
              deletedCount: idsToDelete.length,
            });
          } catch (error) {
            logger.warn('Failed to delete orphaned embeddings', {
              sourceId,
              error: error instanceof Error ? error.message : 'Unknown error',
            });
          }
        }
      }
    } catch (error) {
      logger.warn('Failed to check for orphaned embeddings', {
        organizationId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      // Continue - orphaned detection is not critical
    }

    logger.info('Incremental organization embeddings sync completed', {
      organizationId,
      policies: {
        total: policies.length,
        created: policiesCreated,
        updated: policiesUpdated,
        skipped: policiesSkipped,
      },
      context: {
        total: contextEntries.length,
        created: contextCreated,
        updated: contextUpdated,
        skipped: contextSkipped,
      },
      manualAnswers: {
        total: manualAnswers.length,
        created: manualAnswersCreated,
        updated: manualAnswersUpdated,
        skipped: manualAnswersSkipped,
      },
      knowledgeBaseDocuments: {
        total: knowledgeBaseDocuments.length,
        processed: documentsProcessed,
        skipped: documentsSkipped,
        failed: documentsFailed,
      },
      orphanedDeleted,
    });
  } catch (error) {
    logger.error('Failed to sync organization embeddings', {
      organizationId,
      error: error instanceof Error ? error.message : 'Unknown error',
      errorStack: error instanceof Error ? error.stack : undefined,
    });
    throw error;
  }
}

