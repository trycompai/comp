import { getFleetInstance } from '@/lib/fleet';
import { db } from '@db';

import { logger, queue, task } from '@trigger.dev/sdk';
import { AxiosError } from 'axios';
// Optional: define a queue if we want to control concurrency in v4
const fleetQueue = queue({ name: 'create-fleet-label-for-org', concurrencyLimit: 10 });

export const createFleetLabelForOrg = task({
  id: 'create-fleet-label-for-org',
  queue: fleetQueue,
  retry: {
    maxAttempts: 3,
  },
  run: async ({ organizationId }: { organizationId: string }) => {
    const organization = await db.organization.findUnique({
      where: {
        id: organizationId,
      },
    });

    if (!organization) {
      logger.error(`Organization ${organizationId} not found`);
      return;
    }

    if (organization.isFleetSetupCompleted) {
      logger.info(`Organization ${organizationId} already has fleet set up`);
      return;
    }

    const fleetDevicePathMac = '/Users/Shared/.fleet';
    const fleetDevicePathWindows = 'C:\\ProgramData\\CompAI\\Fleet';
    const windowsFallbackDir = 'C:\\Users\\Public\\CompAI\\Fleet';

    // Simple union query: only file table, constrained per platform path
    const query = `
			SELECT 1 FROM file WHERE path = '${fleetDevicePathMac}/${organizationId}'
			UNION SELECT 1 FROM file WHERE path = '${fleetDevicePathWindows}\\${organizationId}'
			UNION SELECT 1 FROM file WHERE path = '${windowsFallbackDir}\\${organizationId}'
			LIMIT 1;`;
    const normalizedQuery = query.replace(/\s+/g, ' ').trim();

    logger.info('Creating label', {
      name: organization.id,
      query: normalizedQuery,
    });

    const fleet = await getFleetInstance();

    let labelResponse = null;

    try {
      // Create a manual label that we can assign to hosts.
      labelResponse = await fleet.post('/labels', {
        name: organization.id,
        query: normalizedQuery,
      });

      logger.info('Label created', {
        labelId: labelResponse.data.label.id,
      });
    } catch (error) {
      if (error instanceof AxiosError && error.response?.status === 409) {
        const fleetError = error.response.data;
        logger.info('Fleet label already exists for organization', {
          organizationId,
          httpStatus: error.response.status,
          httpStatusText: error.response.statusText,
          fleetMessage: fleetError?.message,
          fleetErrors: fleetError?.errors,
          fleetUuid: fleetError?.uuid,
          axiosMessage: error.message,
          url: error.config?.url,
          method: error.config?.method,
          fullResponseData: error.response.data,
        });
        // Continue with the rest of the flow even if label exists
      } else {
        const fleetError = error instanceof AxiosError ? error.response?.data : null;
        logger.error('Error creating Fleet label', {
          organizationId,
          httpStatus: error instanceof AxiosError ? error.response?.status : undefined,
          httpStatusText: error instanceof AxiosError ? error.response?.statusText : undefined,
          fleetMessage: fleetError?.message,
          fleetErrors: fleetError?.errors,
          fleetUuid: fleetError?.uuid,
          axiosMessage: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined,
          url: error instanceof AxiosError ? error.config?.url : undefined,
          method: error instanceof AxiosError ? error.config?.method : undefined,
          fullResponseData: fleetError,
        });
        throw error;
      }
    }

    // Store label ID in organization (only if we got a successful response)
    if (labelResponse && labelResponse.data?.label?.id) {
      await db.organization.update({
        where: {
          id: organizationId,
        },
        data: {
          fleetDmLabelId: labelResponse.data.label.id,
        },
      });

      logger.info('Stored Fleet label ID in organization', {
        organizationId,
        labelId: labelResponse.data.label.id,
      });
    } else {
      logger.info('Skipping Fleet label ID storage - label already exists or creation failed', {
        organizationId,
      });
    }

    try {
      await db.organization.update({
        where: { id: organizationId },
        data: {
          isFleetSetupCompleted: true,
        },
      });
      logger.info(`Updated organization ${organizationId} to mark fleet setup as completed`);
    } catch (error) {
      logger.error('Error in fleetctl packaging or S3 upload process', {
        error,
      });
    }
  },
});
