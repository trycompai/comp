import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { db } from '@trycompai/db';
import { FleetService } from '../lib/fleet.service';
import type { DeviceResponseDto } from './dto/device-responses.dto';
import type { MemberResponseDto } from './dto/member-responses.dto';

@Injectable()
export class DevicesService {
  private readonly logger = new Logger(DevicesService.name);

  constructor(private readonly fleetService: FleetService) {}

  async findAllByOrganization(
    organizationId: string,
  ): Promise<DeviceResponseDto[]> {
    try {
      // Get organization and its FleetDM label ID
      const organization = await db.organization.findUnique({
        where: { id: organizationId },
        select: {
          id: true,
          name: true,
          fleetDmLabelId: true,
        },
      });

      if (!organization) {
        throw new NotFoundException(
          `Organization with ID ${organizationId} not found`,
        );
      }

      if (!organization.fleetDmLabelId) {
        this.logger.warn(
          `Organization ${organizationId} does not have FleetDM label configured`,
        );
        return [];
      }

      // Get all hosts for the organization's label
      const labelHosts = await this.fleetService.getHostsByLabel(
        organization.fleetDmLabelId,
      );

      if (!labelHosts.hosts || labelHosts.hosts.length === 0) {
        this.logger.log(`No devices found for organization ${organizationId}`);
        return [];
      }

      // Extract host IDs
      const hostIds = labelHosts.hosts.map((host: { id: number }) => host.id);
      this.logger.log(
        `Found ${hostIds.length} devices for organization ${organizationId}`,
      );

      // Get detailed information for each host
      const devices = await this.fleetService.getMultipleHosts(hostIds);

      this.logger.log(
        `Retrieved ${devices.length} device details for organization ${organizationId}`,
      );
      return devices;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(
        `Failed to retrieve devices for organization ${organizationId}:`,
        error,
      );
      throw new Error(`Failed to retrieve devices: ${error.message}`);
    }
  }

  async findAllByMember(
    organizationId: string,
    memberId: string,
  ): Promise<DeviceResponseDto[]> {
    try {
      // First verify the organization exists
      const organization = await db.organization.findUnique({
        where: { id: organizationId },
        select: {
          id: true,
          name: true,
        },
      });

      if (!organization) {
        throw new NotFoundException(
          `Organization with ID ${organizationId} not found`,
        );
      }

      // Verify the member exists and belongs to the organization
      const member = await db.member.findFirst({
        where: {
          id: memberId,
          organizationId: organizationId,
          deactivated: false,
        },
        select: {
          id: true,
          userId: true,
          role: true,
          department: true,
          isActive: true,
          fleetDmLabelId: true,
          organizationId: true,
          createdAt: true,
        },
      });

      if (!member) {
        throw new NotFoundException(
          `Member with ID ${memberId} not found in organization ${organizationId}`,
        );
      }

      if (!member.fleetDmLabelId) {
        this.logger.warn(
          `Member ${memberId} does not have FleetDM label configured`,
        );
        return [];
      }

      // Get devices for the member's specific FleetDM label
      const labelHosts = await this.fleetService.getHostsByLabel(
        member.fleetDmLabelId,
      );

      if (!labelHosts.hosts || labelHosts.hosts.length === 0) {
        this.logger.log(`No devices found for member ${memberId}`);
        return [];
      }

      // Extract host IDs
      const hostIds = labelHosts.hosts.map((host: { id: number }) => host.id);
      this.logger.log(`Found ${hostIds.length} devices for member ${memberId}`);

      // Get detailed information for each host
      const devices = await this.fleetService.getMultipleHosts(hostIds);

      this.logger.log(
        `Retrieved ${devices.length} device details for member ${memberId} in organization ${organizationId}`,
      );
      return devices;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(
        `Failed to retrieve devices for member ${memberId} in organization ${organizationId}:`,
        error,
      );
      throw new Error(`Failed to retrieve member devices: ${error.message}`);
    }
  }

  async getMemberById(
    organizationId: string,
    memberId: string,
  ): Promise<MemberResponseDto> {
    try {
      const member = await db.member.findFirst({
        where: {
          id: memberId,
          organizationId: organizationId,
          deactivated: false,
        },
        select: {
          id: true,
          userId: true,
          role: true,
          department: true,
          isActive: true,
          fleetDmLabelId: true,
          organizationId: true,
          createdAt: true,
        },
      });

      if (!member) {
        throw new NotFoundException(
          `Member with ID ${memberId} not found in organization ${organizationId}`,
        );
      }

      return member;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(
        `Failed to retrieve member ${memberId} in organization ${organizationId}:`,
        error,
      );
      throw new Error(`Failed to retrieve member: ${error.message}`);
    }
  }
}
