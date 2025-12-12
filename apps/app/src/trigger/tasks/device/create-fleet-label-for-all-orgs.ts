import { db } from '@db';
import { logger, task } from '@trigger.dev/sdk';
import { createFleetLabelForOrg } from './create-fleet-label-for-org';

export const createFleetLabelForAllOrgs = task({
  id: 'create-fleet-label-for-all-orgs',
  run: async () => {
    const organizations = await db.organization.findMany({
      where: {
        isFleetSetupCompleted: false,
      },
    });

    logger.info(`Found ${organizations.length} organizations to create fleet label for`);

    const batchItems = organizations.map((organization) => ({
      payload: {
        organizationId: organization.id,
      },
    }));

    logger.info(`Triggering batch job for ${batchItems.length} organizations`);
    await createFleetLabelForOrg.batchTrigger(batchItems);
  },
});
