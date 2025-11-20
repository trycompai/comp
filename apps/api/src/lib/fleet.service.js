"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var FleetService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.FleetService = void 0;
const common_1 = require("@nestjs/common");
const axios_1 = __importStar(require("axios"));
let FleetService = FleetService_1 = class FleetService {
    logger = new common_1.Logger(FleetService_1.name);
    fleetInstance;
    constructor() {
        this.fleetInstance = axios_1.default.create({
            baseURL: `${process.env.FLEET_URL}/api/v1/fleet`,
            headers: {
                Authorization: `Bearer ${process.env.FLEET_TOKEN}`,
                'Content-Type': 'application/json',
            },
            timeout: 30000,
        });
        this.fleetInstance.interceptors.request.use((config) => {
            this.logger.debug(`FleetDM Request: ${config.method?.toUpperCase()} ${config.url}`);
            return config;
        }, (error) => {
            this.logger.error('FleetDM Request Error:', error);
            return Promise.reject(error);
        });
        this.fleetInstance.interceptors.response.use((response) => {
            this.logger.debug(`FleetDM Response: ${response.status} ${response.config.url}`);
            return response;
        }, (error) => {
            this.logger.error(`FleetDM Response Error: ${error.response?.status} ${error.config?.url}`, error.response?.data);
            return Promise.reject(error);
        });
    }
    async getHostsByLabel(labelId) {
        try {
            const response = await this.fleetInstance.get(`/labels/${labelId}/hosts`);
            return response.data;
        }
        catch (error) {
            this.logger.error(`Failed to get hosts for label ${labelId}:`, error);
            throw new Error(`Failed to fetch hosts for label ${labelId}`);
        }
    }
    async getHostById(hostId) {
        try {
            const response = await this.fleetInstance.get(`/hosts/${hostId}`);
            return response.data;
        }
        catch (error) {
            this.logger.error(`Failed to get host ${hostId}:`, error);
            throw new Error(`Failed to fetch host ${hostId}`);
        }
    }
    async getMultipleHosts(hostIds) {
        try {
            const requests = hostIds.map((id) => this.getHostById(id));
            const responses = await Promise.all(requests);
            return responses.map((response) => response.host);
        }
        catch (error) {
            this.logger.error('Failed to get multiple hosts:', error);
            throw new Error('Failed to fetch multiple hosts');
        }
    }
};
exports.FleetService = FleetService;
exports.FleetService = FleetService = FleetService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [])
], FleetService);
//# sourceMappingURL=fleet.service.js.map