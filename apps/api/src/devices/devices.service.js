"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var DevicesService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.DevicesService = void 0;
const common_1 = require("@nestjs/common");
const db_1 = require("@trycompai/db");
const fleet_service_1 = require("../lib/fleet.service");
let DevicesService = DevicesService_1 = class DevicesService {
    fleetService;
    logger = new common_1.Logger(DevicesService_1.name);
    constructor(fleetService) {
        this.fleetService = fleetService;
    }
    async findAllByOrganization(organizationId) {
        try {
            const organization = await db_1.db.organization.findUnique({
                where: { id: organizationId },
                select: {
                    id: true,
                    name: true,
                    fleetDmLabelId: true,
                },
            });
            if (!organization) {
                throw new common_1.NotFoundException(`Organization with ID ${organizationId} not found`);
            }
            if (!organization.fleetDmLabelId) {
                this.logger.warn(`Organization ${organizationId} does not have FleetDM label configured`);
                return [];
            }
            const labelHosts = await this.fleetService.getHostsByLabel(organization.fleetDmLabelId);
            if (!labelHosts.hosts || labelHosts.hosts.length === 0) {
                this.logger.log(`No devices found for organization ${organizationId}`);
                return [];
            }
            const hostIds = labelHosts.hosts.map((host) => host.id);
            this.logger.log(`Found ${hostIds.length} devices for organization ${organizationId}`);
            const devices = await this.fleetService.getMultipleHosts(hostIds);
            this.logger.log(`Retrieved ${devices.length} device details for organization ${organizationId}`);
            return devices;
        }
        catch (error) {
            if (error instanceof common_1.NotFoundException) {
                throw error;
            }
            this.logger.error(`Failed to retrieve devices for organization ${organizationId}:`, error);
            throw new Error(`Failed to retrieve devices: ${error.message}`);
        }
    }
    async findAllByMember(organizationId, memberId) {
        try {
            const organization = await db_1.db.organization.findUnique({
                where: { id: organizationId },
                select: {
                    id: true,
                    name: true,
                },
            });
            if (!organization) {
                throw new common_1.NotFoundException(`Organization with ID ${organizationId} not found`);
            }
            const member = await db_1.db.member.findFirst({
                where: {
                    id: memberId,
                    organizationId: organizationId,
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
                throw new common_1.NotFoundException(`Member with ID ${memberId} not found in organization ${organizationId}`);
            }
            if (!member.fleetDmLabelId) {
                this.logger.warn(`Member ${memberId} does not have FleetDM label configured`);
                return [];
            }
            const labelHosts = await this.fleetService.getHostsByLabel(member.fleetDmLabelId);
            if (!labelHosts.hosts || labelHosts.hosts.length === 0) {
                this.logger.log(`No devices found for member ${memberId}`);
                return [];
            }
            const hostIds = labelHosts.hosts.map((host) => host.id);
            this.logger.log(`Found ${hostIds.length} devices for member ${memberId}`);
            const devices = await this.fleetService.getMultipleHosts(hostIds);
            this.logger.log(`Retrieved ${devices.length} device details for member ${memberId} in organization ${organizationId}`);
            return devices;
        }
        catch (error) {
            if (error instanceof common_1.NotFoundException) {
                throw error;
            }
            this.logger.error(`Failed to retrieve devices for member ${memberId} in organization ${organizationId}:`, error);
            throw new Error(`Failed to retrieve member devices: ${error.message}`);
        }
    }
    async getMemberById(organizationId, memberId) {
        try {
            const member = await db_1.db.member.findFirst({
                where: {
                    id: memberId,
                    organizationId: organizationId,
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
                throw new common_1.NotFoundException(`Member with ID ${memberId} not found in organization ${organizationId}`);
            }
            return member;
        }
        catch (error) {
            if (error instanceof common_1.NotFoundException) {
                throw error;
            }
            this.logger.error(`Failed to retrieve member ${memberId} in organization ${organizationId}:`, error);
            throw new Error(`Failed to retrieve member: ${error.message}`);
        }
    }
};
exports.DevicesService = DevicesService;
exports.DevicesService = DevicesService = DevicesService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [fleet_service_1.FleetService])
], DevicesService);
//# sourceMappingURL=devices.service.js.map