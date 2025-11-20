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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var DeviceAgentService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.DeviceAgentService = void 0;
const common_1 = require("@nestjs/common");
const client_s3_1 = require("@aws-sdk/client-s3");
const stream_1 = require("stream");
const archiver_1 = __importDefault(require("archiver"));
const windows_1 = require("./scripts/windows");
const common_2 = require("./scripts/common");
let DeviceAgentService = DeviceAgentService_1 = class DeviceAgentService {
    logger = new common_1.Logger(DeviceAgentService_1.name);
    s3Client;
    fleetBucketName;
    constructor() {
        this.fleetBucketName =
            process.env.FLEET_AGENT_BUCKET_NAME || process.env.APP_AWS_BUCKET_NAME;
        this.s3Client = new client_s3_1.S3Client({
            region: process.env.APP_AWS_REGION || 'us-east-1',
            credentials: {
                accessKeyId: process.env.APP_AWS_ACCESS_KEY_ID,
                secretAccessKey: process.env.APP_AWS_SECRET_ACCESS_KEY,
            },
        });
    }
    async downloadMacAgent() {
        try {
            const macosPackageFilename = 'Comp AI Agent-1.0.0-arm64.dmg';
            const packageKey = `macos/${macosPackageFilename}`;
            this.logger.log(`Downloading macOS agent from S3: ${packageKey}`);
            const getObjectCommand = new client_s3_1.GetObjectCommand({
                Bucket: this.fleetBucketName,
                Key: packageKey,
            });
            const s3Response = await this.s3Client.send(getObjectCommand);
            if (!s3Response.Body) {
                throw new common_1.NotFoundException('macOS agent DMG file not found in S3');
            }
            const s3Stream = s3Response.Body;
            this.logger.log(`Successfully retrieved macOS agent: ${macosPackageFilename}`);
            return {
                stream: s3Stream,
                filename: macosPackageFilename,
                contentType: 'application/x-apple-diskimage',
            };
        }
        catch (error) {
            if (error instanceof common_1.NotFoundException) {
                throw error;
            }
            this.logger.error('Failed to download macOS agent from S3:', error);
            throw error;
        }
    }
    async downloadWindowsAgent(organizationId, employeeId) {
        try {
            this.logger.log(`Creating Windows agent zip for org ${organizationId}, employee ${employeeId}`);
            const fleetDevicePathWindows = 'C:\\ProgramData\\CompAI\\Fleet';
            const script = (0, windows_1.generateWindowsScript)({
                orgId: organizationId,
                employeeId: employeeId,
                fleetDevicePath: fleetDevicePathWindows,
            });
            const passThrough = new stream_1.PassThrough();
            const archive = (0, archiver_1.default)('zip', { zlib: { level: 9 } });
            archive.pipe(passThrough);
            archive.on('error', (err) => {
                this.logger.error('Archive error:', err);
                passThrough.destroy(err);
            });
            archive.on('warning', (warn) => {
                this.logger.warn('Archive warning:', warn);
            });
            const scriptFilename = (0, common_2.getScriptFilename)('windows');
            archive.append(script, { name: scriptFilename, mode: 0o755 });
            const readmeContent = (0, common_2.getReadmeContent)('windows');
            archive.append(readmeContent, { name: 'README.txt' });
            const windowsPackageFilename = 'fleet-osquery.msi';
            const packageKey = `windows/${windowsPackageFilename}`;
            const packageFilename = (0, common_2.getPackageFilename)('windows');
            this.logger.log(`Downloading Windows MSI from S3: ${packageKey}`);
            const getObjectCommand = new client_s3_1.GetObjectCommand({
                Bucket: this.fleetBucketName,
                Key: packageKey,
            });
            const s3Response = await this.s3Client.send(getObjectCommand);
            if (s3Response.Body) {
                const s3Stream = s3Response.Body;
                s3Stream.on('error', (err) => {
                    this.logger.error('S3 stream error:', err);
                    passThrough.destroy(err);
                });
                archive.append(s3Stream, { name: packageFilename, store: true });
            }
            else {
                this.logger.warn('Windows MSI file not found in S3, creating zip without MSI');
            }
            archive.finalize();
            this.logger.log('Successfully created Windows agent zip');
            return {
                stream: passThrough,
                filename: `compai-device-agent-windows.zip`,
                contentType: 'application/zip',
            };
        }
        catch (error) {
            this.logger.error('Failed to create Windows agent zip:', error);
            throw error;
        }
    }
};
exports.DeviceAgentService = DeviceAgentService;
exports.DeviceAgentService = DeviceAgentService = DeviceAgentService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [])
], DeviceAgentService);
//# sourceMappingURL=device-agent.service.js.map