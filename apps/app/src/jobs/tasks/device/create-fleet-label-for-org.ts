import { getFleetInstance } from "@/lib/fleet";
import { db } from "@comp/db";
import { logger, task } from "@trigger.dev/sdk/v3";

export const createFleetLabelForOrg = task({
  id: "create-fleet-label-for-org",
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

    const fleetDevicePathMac = process.env.FLEET_DEVICE_PATH_MAC;
    if (!fleetDevicePathMac) {
      logger.error("FLEET_DEVICE_PATH_MAC not configured");
      return;
    }

    logger.info("Creating label", {
      name: organization.id,
      query: `SELECT 1 FROM file WHERE path = '${fleetDevicePathMac}/${organizationId}' LIMIT 1;`,
    });

    const fleet = await getFleetInstance();

    // Create a manual label that we can assign to hosts.
    const response = await fleet.post("/labels", {
      name: organization.id,
      query: `SELECT 1 FROM file WHERE path = '${fleetDevicePathMac}/${organizationId}' LIMIT 1;`,
    });

    logger.info("Label created", {
      labelId: response.data.label.id,
    });

    // Store label ID in organization.
    await db.organization.update({
      where: {
        id: organizationId,
      },
      data: {
        fleetDmLabelId: response.data.label.id,
      },
    });

    try {
      await db.organization.update({
        where: { id: organizationId },
        data: {
          isFleetSetupCompleted: true,
        },
      });
      logger.info(`Stored S3 bundle URL for organization ${organizationId}`);
    } catch (error) {
      logger.error("Error in fleetctl packaging or S3 upload process", {
        error,
      });
    }
  },
});
