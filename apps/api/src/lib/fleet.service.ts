import { Injectable, Logger } from '@nestjs/common';
import axios, { AxiosInstance } from 'axios';

@Injectable()
export class FleetService {
  private readonly logger = new Logger(FleetService.name);
  private fleetInstance: AxiosInstance;

  constructor() {
    this.fleetInstance = axios.create({
      baseURL: `${process.env.FLEET_URL}/api/v1/fleet`,
      headers: {
        Authorization: `Bearer ${process.env.FLEET_TOKEN}`,
        'Content-Type': 'application/json',
      },
      timeout: 30000, // 30 second timeout
    });

    // Add request/response interceptors for logging
    this.fleetInstance.interceptors.request.use(
      (config) => {
        this.logger.debug(
          `FleetDM Request: ${config.method?.toUpperCase()} ${config.url}`,
        );
        return config;
      },
      (error) => {
        this.logger.error('FleetDM Request Error:', error);
        return Promise.reject(error);
      },
    );

    this.fleetInstance.interceptors.response.use(
      (response) => {
        this.logger.debug(
          `FleetDM Response: ${response.status} ${response.config.url}`,
        );
        return response;
      },
      (error) => {
        this.logger.error(
          `FleetDM Response Error: ${error.response?.status} ${error.config?.url}`,
          error.response?.data,
        );
        return Promise.reject(error);
      },
    );
  }

  async getHostsByLabel(labelId: number) {
    try {
      const response = await this.fleetInstance.get(`/labels/${labelId}/hosts`);
      return response.data;
    } catch (error) {
      this.logger.error(`Failed to get hosts for label ${labelId}:`, error);
      throw new Error(`Failed to fetch hosts for label ${labelId}`);
    }
  }

  async getHostById(hostId: number) {
    try {
      const response = await this.fleetInstance.get(`/hosts/${hostId}`);
      return response.data;
    } catch (error) {
      this.logger.error(`Failed to get host ${hostId}:`, error);
      throw new Error(`Failed to fetch host ${hostId}`);
    }
  }

  async getMultipleHosts(hostIds: number[]) {
    try {
      const requests = hostIds.map((id) => this.getHostById(id));
      const responses = await Promise.all(requests);
      return responses.map((response) => response.host);
    } catch (error) {
      this.logger.error('Failed to get multiple hosts:', error);
      throw new Error('Failed to fetch multiple hosts');
    }
  }

  /**
   * Remove all hosts from FleetDM that belong to a specific label
   * @param fleetDmLabelId - The FleetDM label ID
   * @returns Promise with deletion results
   */
  async removeHostsByLabel(fleetDmLabelId: number): Promise<{
    deletedCount: number;
    failedCount: number;
    hostIds: number[];
  }> {
    try {
      // Get all hosts for this label
      const labelHosts = await this.getHostsByLabel(fleetDmLabelId);

      if (!labelHosts.hosts || labelHosts.hosts.length === 0) {
        this.logger.log(`No hosts found for label ${fleetDmLabelId}`);
        return {
          deletedCount: 0,
          failedCount: 0,
          hostIds: [],
        };
      }

      // Extract host IDs
      const hostIds = labelHosts.hosts.map((host: { id: number }) => host.id);

      // Delete each host
      const deletePromises = hostIds.map(async (hostId: number) => {
        try {
          await this.fleetInstance.delete(`/hosts/${hostId}`);
          this.logger.debug(`Deleted host ${hostId} from FleetDM`);
          return { success: true, hostId };
        } catch (error) {
          this.logger.error(`Failed to delete host ${hostId}:`, error);
          return { success: false, hostId };
        }
      });

      const results = await Promise.all(deletePromises);
      const deletedCount = results.filter((r) => r.success).length;
      const failedCount = results.filter((r) => !r.success).length;

      this.logger.log(
        `Removed hosts from FleetDM for label ${fleetDmLabelId}: ${deletedCount} deleted, ${failedCount} failed`,
      );

      return {
        deletedCount,
        failedCount,
        hostIds,
      };
    } catch (error) {
      this.logger.error(`Failed to remove hosts for label ${fleetDmLabelId}:`, error);
      throw new Error(`Failed to remove hosts for label ${fleetDmLabelId}: ${error.message}`);
    }
  }
}
