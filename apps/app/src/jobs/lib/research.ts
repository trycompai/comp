import { env } from '@/env.mjs';
import { logger } from '@trigger.dev/sdk';
import { z, ZodSchema } from 'zod';

export const initialResponseSchema = z.object({
  success: z.boolean(),
  id: z.string(),
});

// Make statusResponseSchema generic to allow any data shape
export const statusResponseSchema = z.object({
  success: z.boolean(),
  status: z.enum(['processing', 'completed', 'failed', 'cancelled']),
  data: z.unknown().optional(),
  expiresAt: z.string().optional(),
});

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const MAX_POLL_DURATION_MS = 1000 * 60 * 5;
const POLL_INTERVAL_MS = 5000;

export interface ResearchJobOptions<T> {
  website: string;
  prompt: string;
  schema: any; // JSON schema for Firecrawl
  zodSchema: ZodSchema<T>; // Zod schema for validation
  dbSave?: (data: T) => Promise<any>; // Optional callback to save data
}

export async function researchJobCore<T>({
  website,
  prompt,
  schema,
  zodSchema,
  dbSave,
}: ResearchJobOptions<T>) {
  logger.info('Starting generic research job', { website, prompt });
  const startTime = Date.now();

  try {
    const initialResponse = await fetch('https://api.firecrawl.dev/v1/extract', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${env.FIRECRAWL_API_KEY}`,
      },
      body: JSON.stringify({
        urls: [website],
        prompt,
        schema,
        scrapeOptions: {
          onlyMainContent: true,
          removeBase64Images: true,
        },
      }),
    });

    const initialData = await initialResponse.json();
    logger.info('Initial Firecrawl response', { initialData });

    const parsedInitial = initialResponseSchema.safeParse(initialData);
    if (!parsedInitial.success || !parsedInitial.data.id) {
      logger.error('Failed to parse initial Firecrawl response or missing id', {
        error: parsedInitial.error?.issues,
        data: initialData,
      });
      return {
        success: false,
        error: 'Invalid initial response from Firecrawl',
      };
    }

    const { id: jobId } = parsedInitial.data;
    logger.info('Firecrawl job started', { jobId });

    while (Date.now() - startTime < MAX_POLL_DURATION_MS) {
      await sleep(POLL_INTERVAL_MS);
      const statusCheckResponse = await fetch(`https://api.firecrawl.dev/v1/extract/${jobId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${env.FIRECRAWL_API_KEY}`,
        },
      });
      const statusData = await statusCheckResponse.json();
      logger.debug('Polling Firecrawl job status', { jobId, statusData });
      const parsedStatus = statusResponseSchema.safeParse(statusData);
      if (!parsedStatus.success) {
        logger.warn('Failed to parse Firecrawl status response', {
          error: parsedStatus.error?.issues,
          data: statusData,
        });
        continue;
      }
      const { status, data } = parsedStatus.data;
      switch (status) {
        case 'completed': {
          logger.info('Firecrawl job completed successfully', {
            jobId,
            data,
          });
          const finalDataValidation = zodSchema.safeParse(data);
          if (!finalDataValidation.success) {
            logger.error('Final data validation failed', {
              error: finalDataValidation.error.issues,
              data,
            });
            return {
              success: false,
              error: 'Invalid final data structure from Firecrawl',
            };
          }
          if (dbSave) {
            await dbSave(finalDataValidation.data);
          }
          return {
            success: true,
            data: finalDataValidation.data,
          };
        }
        case 'processing':
          logger.info('Firecrawl job still processing', { jobId });
          continue;
        case 'failed':
          logger.error('Firecrawl job failed', { jobId, statusData });
          return {
            success: false,
            error: 'Firecrawl job failed',
          };
        case 'cancelled':
          logger.warn('Firecrawl job was cancelled', {
            jobId,
            statusData,
          });
          return {
            success: false,
            error: 'Firecrawl job cancelled',
          };
        default:
          logger.warn('Unknown Firecrawl job status', {
            jobId,
            status,
          });
          continue;
      }
    }
    logger.error('Firecrawl job polling timed out', { jobId, website });
    return { success: false, error: 'Firecrawl job polling timed out' };
  } catch (error: any) {
    logger.error('Error during research job or polling', {
      error: error.message,
      stack: error.stack,
      website,
    });
    return {
      success: false,
      error: error.message || 'Unknown error occurred',
    };
  }
}
