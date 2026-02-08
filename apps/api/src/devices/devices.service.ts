import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { db } from '@trycompai/db';
import { mergeDeviceLists } from '@trycompai/utils/devices';
import { FleetService } from '../lib/fleet.service';
import { DeviceResponseDto } from './dto/device-responses.dto';
import type { MemberResponseDto } from './dto/member-responses.dto';

/**
 * Hybrid device service that fetches from both FleetDM and the Device Agent database.
 * FleetDM is the legacy system; Device Agent is the new system.
 * Results are merged and deduplicated by serial number / hostname.
 */
@Injectable()
export class DevicesService {
  private readonly logger = new Logger(DevicesService.name);

  constructor(private readonly fleetService: FleetService) {}

  async findAllByOrganization(
    organizationId: string,
  ): Promise<DeviceResponseDto[]> {
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

    // Fetch from both sources in parallel
    const [fleetDevices, agentDevices] = await Promise.all([
      this.getFleetDevicesForOrg(organization.fleetDmLabelId, organizationId),
      this.getAgentDevicesForOrg(organizationId),
    ]);

    // Merge and deduplicate (agent devices take priority)
    return mergeDeviceLists(agentDevices, fleetDevices, {
      getSerialNumber: (d) => d.hardware_serial,
      getHostname: (d) => d.hostname,
    });
  }

  async findAllByMember(
    organizationId: string,
    memberId: string,
  ): Promise<DeviceResponseDto[]> {
    // Verify organization exists
    const organization = await db.organization.findUnique({
      where: { id: organizationId },
      select: { id: true, name: true },
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

    // Fetch from both sources in parallel
    const [fleetDevices, agentDevices] = await Promise.all([
      this.getFleetDevicesForMember(member.fleetDmLabelId, memberId),
      this.getAgentDevicesForUser(member.userId, organizationId),
    ]);

    return mergeDeviceLists(agentDevices, fleetDevices, {
      getSerialNumber: (d) => d.hardware_serial,
      getHostname: (d) => d.hostname,
    });
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

  // --- Private helpers ---

  private async getFleetDevicesForOrg(
    fleetDmLabelId: number | null,
    organizationId: string,
  ): Promise<DeviceResponseDto[]> {
    if (!fleetDmLabelId) {
      return [];
    }

    try {
      const labelHosts =
        await this.fleetService.getHostsByLabel(fleetDmLabelId);

      if (!labelHosts.hosts || labelHosts.hosts.length === 0) {
        return [];
      }

      const hostIds = labelHosts.hosts.map((host: { id: number }) => host.id);
      const devices = await this.fleetService.getMultipleHosts(hostIds);

      // Tag each device with source
      return devices.map((d: DeviceResponseDto) => ({
        ...d,
        source: 'fleet' as const,
      }));
    } catch (error) {
      this.logger.warn(
        `Failed to fetch FleetDM devices for org ${organizationId}: ${error instanceof Error ? error.message : error}`,
      );
      return [];
    }
  }

  private async getFleetDevicesForMember(
    fleetDmLabelId: number | null,
    memberId: string,
  ): Promise<DeviceResponseDto[]> {
    if (!fleetDmLabelId) {
      return [];
    }

    try {
      const labelHosts =
        await this.fleetService.getHostsByLabel(fleetDmLabelId);

      if (!labelHosts.hosts || labelHosts.hosts.length === 0) {
        return [];
      }

      const hostIds = labelHosts.hosts.map((host: { id: number }) => host.id);
      const devices = await this.fleetService.getMultipleHosts(hostIds);

      return devices.map((d: DeviceResponseDto) => ({
        ...d,
        source: 'fleet' as const,
      }));
    } catch (error) {
      this.logger.warn(
        `Failed to fetch FleetDM devices for member ${memberId}: ${error instanceof Error ? error.message : error}`,
      );
      return [];
    }
  }

  private async getAgentDevicesForOrg(
    organizationId: string,
  ): Promise<DeviceResponseDto[]> {
    try {
      const devices = await db.device.findMany({
        where: { organizationId },
        include: {
          checks: {
            orderBy: { checkedAt: 'desc' },
          },
          user: {
            select: { name: true, email: true },
          },
        },
      });

      return devices.map((device) => this.mapAgentDeviceToDto(device));
    } catch (error) {
      this.logger.warn(
        `Failed to fetch agent devices for org ${organizationId}: ${error instanceof Error ? error.message : error}`,
      );
      return [];
    }
  }

  private async getAgentDevicesForUser(
    userId: string,
    organizationId: string,
  ): Promise<DeviceResponseDto[]> {
    try {
      const devices = await db.device.findMany({
        where: { userId, organizationId },
        include: {
          checks: {
            orderBy: { checkedAt: 'desc' },
          },
          user: {
            select: { name: true, email: true },
          },
        },
      });

      return devices.map((device) => this.mapAgentDeviceToDto(device));
    } catch (error) {
      this.logger.warn(
        `Failed to fetch agent devices for user ${userId}: ${error instanceof Error ? error.message : error}`,
      );
      return [];
    }
  }

  private mapAgentDeviceToDto(device: {
    id: string;
    name: string;
    hostname: string;
    platform: string;
    osVersion: string;
    serialNumber: string | null;
    hardwareModel: string | null;
    isCompliant: boolean;
    lastCheckIn: Date | null;
    agentVersion: string | null;
    installedAt: Date;
    user: { name: string; email: string };
    checks: Array<{
      id: string;
      checkType: string;
      passed: boolean;
      details: unknown;
      checkedAt: Date;
    }>;
  }): DeviceResponseDto {
    // Construct a partial DTO with device-agent fields; consumers should handle
    // missing FleetDM-specific fields gracefully via the `source` field.
    const dto = new DeviceResponseDto();
    dto.id = device.id;
    dto.computer_name = device.name;
    dto.hostname = device.hostname;
    dto.platform = device.platform === 'macos' ? 'darwin' : device.platform;
    dto.os_version = device.osVersion;
    dto.hardware_serial = device.serialNumber ?? '';
    dto.hardware_model = device.hardwareModel ?? '';
    dto.seen_time = device.lastCheckIn?.toISOString() ?? '';
    dto.created_at = device.installedAt.toISOString();
    dto.updated_at = device.installedAt.toISOString();
    dto.display_name = device.name;
    dto.display_text = device.name;
    dto.status = device.isCompliant ? 'compliant' : 'non-compliant';
    dto.disk_encryption_enabled = device.checks.some(
      (c) => c.checkType === 'disk_encryption' && c.passed,
    );
    dto.source = 'device_agent';
    // Default empty values for FleetDM-specific fields
    dto.software = [];
    dto.pack_stats = [];
    dto.users = [];
    dto.labels = [];
    dto.packs = [];
    dto.batteries = [];
    dto.end_users = [];
    dto.policies = [];
    dto.issues = {};
    dto.mdm = {};
    return dto;
  }
}
