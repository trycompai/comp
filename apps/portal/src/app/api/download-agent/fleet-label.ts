import { getFleetInstance } from '@/utils/fleet';
import { logger } from '@/utils/logger';
import { db } from '@comp/db';
import { AxiosError } from 'axios';
import type { CreateFleetLabelParams } from './types';

export async function createFleetLabel({
  employeeId,
  memberId,
  os,
  fleetDevicePathMac,
  fleetDevicePathWindows,
}: CreateFleetLabelParams): Promise<void> {
  try {
    const fleet = await getFleetInstance();

    // Create platform-specific query
    const query =
      os === 'macos'
        ? `SELECT 1 FROM file WHERE path = '${fleetDevicePathMac}/${employeeId}' LIMIT 1;`
        : `SELECT 1 FROM file WHERE path = '${fleetDevicePathWindows}\\${employeeId}' LIMIT 1;`;

    const response = await fleet.post('/labels', {
      name: employeeId,
      query: query,
    });

    const labelId = response.data.label.id;

    await db.member.update({
      where: {
        id: memberId,
      },
      data: {
        fleetDmLabelId: labelId,
      },
    });
  } catch (error) {
    if (error instanceof AxiosError && error.response?.status === 409) {
      // Label already exists, which is fine.
      logger('Fleet label already exists, skipping creation.', { employeeId });
    } else {
      // Re-throw other errors
      throw error;
    }
  }
}
