import { getFleetInstance } from '@/utils/fleet';
import { logger } from '@/utils/logger';
import { db } from '@db';
import { AxiosError } from 'axios';
import type { CreateFleetLabelParams } from './types';

export async function createFleetLabel({
  employeeId,
  memberId,
  os,
  fleetDevicePathMac,
  fleetDevicePathWindows,
}: CreateFleetLabelParams): Promise<void> {
  logger('createFleetLabel function called', {
    employeeId,
    memberId,
    os,
    fleetDevicePathMac,
    fleetDevicePathWindows,
  });

  try {
    logger('Getting Fleet instance...');
    const fleet = await getFleetInstance();
    logger('Fleet instance obtained successfully');

    // OS-specific queries: mac uses file-only; Windows uses UNION with file and registry
    const query =
      os === 'macos'
        ? `SELECT 1 FROM file WHERE path = '${fleetDevicePathMac}/${employeeId}' LIMIT 1;`
        : `SELECT 1 FROM file WHERE path = '${fleetDevicePathWindows}\\${employeeId}'
           UNION SELECT 1 FROM file WHERE path = 'C:\\Users\\Public\\CompAI\\Fleet\\${employeeId}'
           LIMIT 1;`;

    // Normalize whitespace to a single line to avoid issues with newlines/tabs
    const normalizedQuery = query.replace(/\s+/g, ' ').trim();

    logger('Generated Fleet query for label creation', {
      employeeId,
      os,
      query: normalizedQuery,
    });

    logger('Sending POST request to Fleet API to create label...', {
      labelName: employeeId,
      endpoint: '/labels',
      requestBody: {
        name: employeeId,
        query: normalizedQuery,
      },
    });

    const response = await fleet.post('/labels', {
      name: employeeId,
      query: normalizedQuery,
    });

    logger('Fleet API response received', {
      status: response.status,
      statusText: response.statusText,
      labelId: response.data?.label?.id,
      responseData: response.data,
      headers: response.headers,
    });

    const labelId = response.data.label.id;

    logger('Updating member record with Fleet label ID', {
      memberId,
      labelId,
      employeeId,
    });

    await db.member.update({
      where: {
        id: memberId,
      },
      data: {
        fleetDmLabelId: labelId,
      },
    });

    logger('Member record updated successfully with Fleet label ID', {
      memberId,
      labelId,
      employeeId,
    });
  } catch (error) {
    if (error instanceof AxiosError && error.response?.status === 409) {
      // Label already exists, which is fine.
      const fleetError = error.response.data;
      logger('Fleet label already exists, skipping creation.', {
        employeeId,
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
    } else {
      // Log the error details before re-throwing
      const fleetError = error instanceof AxiosError ? error.response?.data : null;
      logger('Error creating Fleet label', {
        employeeId,
        memberId,
        os,
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

      // Re-throw other errors
      throw error;
    }
  }
}
