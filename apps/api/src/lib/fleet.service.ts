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
}
