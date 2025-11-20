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
Object.defineProperty(exports, "__esModule", { value: true });
exports.DeviceResponseDto = exports.FleetPolicyDto = void 0;
const swagger_1 = require("@nestjs/swagger");
class FleetPolicyDto {
    id;
    name;
    query;
    critical;
    description;
    author_id;
    author_name;
    author_email;
    team_id;
    resolution;
    platform;
    calendar_events_enabled;
    created_at;
    updated_at;
    response;
}
exports.FleetPolicyDto = FleetPolicyDto;
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Policy ID', example: 123 }),
    __metadata("design:type", Number)
], FleetPolicyDto.prototype, "id", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Policy name', example: 'Password Policy' }),
    __metadata("design:type", String)
], FleetPolicyDto.prototype, "name", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Policy query', example: 'SELECT * FROM users;' }),
    __metadata("design:type", String)
], FleetPolicyDto.prototype, "query", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Whether policy is critical', example: true }),
    __metadata("design:type", Boolean)
], FleetPolicyDto.prototype, "critical", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Policy description',
        example: 'Ensures strong passwords',
    }),
    __metadata("design:type", String)
], FleetPolicyDto.prototype, "description", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Author ID', example: 456 }),
    __metadata("design:type", Number)
], FleetPolicyDto.prototype, "author_id", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Author name', example: 'John Doe' }),
    __metadata("design:type", String)
], FleetPolicyDto.prototype, "author_name", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Author email', example: 'john@example.com' }),
    __metadata("design:type", String)
], FleetPolicyDto.prototype, "author_email", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Team ID', example: 789, nullable: true }),
    __metadata("design:type", Number)
], FleetPolicyDto.prototype, "team_id", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Policy resolution',
        example: 'Update password settings',
    }),
    __metadata("design:type", String)
], FleetPolicyDto.prototype, "resolution", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Platform', example: 'darwin' }),
    __metadata("design:type", String)
], FleetPolicyDto.prototype, "platform", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Calendar events enabled', example: false }),
    __metadata("design:type", Boolean)
], FleetPolicyDto.prototype, "calendar_events_enabled", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Created at', example: '2024-01-01T00:00:00Z' }),
    __metadata("design:type", String)
], FleetPolicyDto.prototype, "created_at", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Updated at', example: '2024-01-15T00:00:00Z' }),
    __metadata("design:type", String)
], FleetPolicyDto.prototype, "updated_at", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Policy response', example: 'compliant' }),
    __metadata("design:type", String)
], FleetPolicyDto.prototype, "response", void 0);
class DeviceResponseDto {
    created_at;
    updated_at;
    software;
    software_updated_at;
    id;
    detail_updated_at;
    label_updated_at;
    policy_updated_at;
    last_enrolled_at;
    seen_time;
    refetch_requested;
    hostname;
    uuid;
    platform;
    osquery_version;
    orbit_version;
    fleet_desktop_version;
    scripts_enabled;
    os_version;
    build;
    platform_like;
    code_name;
    uptime;
    memory;
    cpu_type;
    cpu_subtype;
    cpu_brand;
    cpu_physical_cores;
    cpu_logical_cores;
    hardware_vendor;
    hardware_model;
    hardware_version;
    hardware_serial;
    computer_name;
    public_ip;
    primary_ip;
    primary_mac;
    distributed_interval;
    config_tls_refresh;
    logger_tls_period;
    team_id;
    pack_stats;
    team_name;
    users;
    gigs_disk_space_available;
    percent_disk_space_available;
    gigs_total_disk_space;
    disk_encryption_enabled;
    issues;
    mdm;
    refetch_critical_queries_until;
    last_restarted_at;
    policies;
    labels;
    packs;
    batteries;
    end_users;
    last_mdm_enrolled_at;
    last_mdm_checked_in_at;
    status;
    display_text;
    display_name;
}
exports.DeviceResponseDto = DeviceResponseDto;
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Device created at',
        example: '2024-01-01T00:00:00Z',
    }),
    __metadata("design:type", String)
], DeviceResponseDto.prototype, "created_at", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Device updated at',
        example: '2024-01-15T00:00:00Z',
    }),
    __metadata("design:type", String)
], DeviceResponseDto.prototype, "updated_at", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Software list',
        type: 'array',
        items: { type: 'object' },
    }),
    __metadata("design:type", Array)
], DeviceResponseDto.prototype, "software", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Software updated at',
        example: '2024-01-10T00:00:00Z',
    }),
    __metadata("design:type", String)
], DeviceResponseDto.prototype, "software_updated_at", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Device ID', example: 123 }),
    __metadata("design:type", Number)
], DeviceResponseDto.prototype, "id", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Detail updated at',
        example: '2024-01-10T00:00:00Z',
    }),
    __metadata("design:type", String)
], DeviceResponseDto.prototype, "detail_updated_at", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Label updated at',
        example: '2024-01-10T00:00:00Z',
    }),
    __metadata("design:type", String)
], DeviceResponseDto.prototype, "label_updated_at", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Policy updated at',
        example: '2024-01-10T00:00:00Z',
    }),
    __metadata("design:type", String)
], DeviceResponseDto.prototype, "policy_updated_at", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Last enrolled at',
        example: '2024-01-01T00:00:00Z',
    }),
    __metadata("design:type", String)
], DeviceResponseDto.prototype, "last_enrolled_at", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Last seen time',
        example: '2024-01-15T12:00:00Z',
    }),
    __metadata("design:type", String)
], DeviceResponseDto.prototype, "seen_time", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Refetch requested', example: false }),
    __metadata("design:type", Boolean)
], DeviceResponseDto.prototype, "refetch_requested", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Hostname', example: 'johns-macbook' }),
    __metadata("design:type", String)
], DeviceResponseDto.prototype, "hostname", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Device UUID', example: 'abc123def456' }),
    __metadata("design:type", String)
], DeviceResponseDto.prototype, "uuid", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Platform', example: 'darwin' }),
    __metadata("design:type", String)
], DeviceResponseDto.prototype, "platform", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Osquery version', example: '5.10.2' }),
    __metadata("design:type", String)
], DeviceResponseDto.prototype, "osquery_version", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Orbit version', example: '1.19.0' }),
    __metadata("design:type", String)
], DeviceResponseDto.prototype, "orbit_version", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Fleet desktop version', example: '1.19.0' }),
    __metadata("design:type", String)
], DeviceResponseDto.prototype, "fleet_desktop_version", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Scripts enabled', example: true }),
    __metadata("design:type", Boolean)
], DeviceResponseDto.prototype, "scripts_enabled", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'OS version', example: 'macOS 14.2.1' }),
    __metadata("design:type", String)
], DeviceResponseDto.prototype, "os_version", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Build', example: '23C71' }),
    __metadata("design:type", String)
], DeviceResponseDto.prototype, "build", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Platform like', example: 'darwin' }),
    __metadata("design:type", String)
], DeviceResponseDto.prototype, "platform_like", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Code name', example: 'sonoma' }),
    __metadata("design:type", String)
], DeviceResponseDto.prototype, "code_name", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Uptime in seconds', example: 86400 }),
    __metadata("design:type", Number)
], DeviceResponseDto.prototype, "uptime", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Memory in bytes', example: 17179869184 }),
    __metadata("design:type", Number)
], DeviceResponseDto.prototype, "memory", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'CPU type', example: 'x86_64' }),
    __metadata("design:type", String)
], DeviceResponseDto.prototype, "cpu_type", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'CPU subtype', example: 'x86_64h' }),
    __metadata("design:type", String)
], DeviceResponseDto.prototype, "cpu_subtype", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'CPU brand',
        example: 'Intel(R) Core(TM) i7-9750H',
    }),
    __metadata("design:type", String)
], DeviceResponseDto.prototype, "cpu_brand", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'CPU physical cores', example: 6 }),
    __metadata("design:type", Number)
], DeviceResponseDto.prototype, "cpu_physical_cores", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'CPU logical cores', example: 12 }),
    __metadata("design:type", Number)
], DeviceResponseDto.prototype, "cpu_logical_cores", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Hardware vendor', example: 'Apple Inc.' }),
    __metadata("design:type", String)
], DeviceResponseDto.prototype, "hardware_vendor", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Hardware model', example: 'MacBookPro16,1' }),
    __metadata("design:type", String)
], DeviceResponseDto.prototype, "hardware_model", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Hardware version', example: '1.0' }),
    __metadata("design:type", String)
], DeviceResponseDto.prototype, "hardware_version", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Hardware serial', example: 'C02XW0AAJGH6' }),
    __metadata("design:type", String)
], DeviceResponseDto.prototype, "hardware_serial", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Computer name', example: "John's MacBook Pro" }),
    __metadata("design:type", String)
], DeviceResponseDto.prototype, "computer_name", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Public IP', example: '203.0.113.1' }),
    __metadata("design:type", String)
], DeviceResponseDto.prototype, "public_ip", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Primary IP', example: '192.168.1.100' }),
    __metadata("design:type", String)
], DeviceResponseDto.prototype, "primary_ip", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Primary MAC', example: '00:11:22:33:44:55' }),
    __metadata("design:type", String)
], DeviceResponseDto.prototype, "primary_mac", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Distributed interval', example: 10 }),
    __metadata("design:type", Number)
], DeviceResponseDto.prototype, "distributed_interval", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Config TLS refresh', example: 3600 }),
    __metadata("design:type", Number)
], DeviceResponseDto.prototype, "config_tls_refresh", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Logger TLS period', example: 300 }),
    __metadata("design:type", Number)
], DeviceResponseDto.prototype, "logger_tls_period", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Team ID', example: 1, nullable: true }),
    __metadata("design:type", Number)
], DeviceResponseDto.prototype, "team_id", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Pack stats',
        type: 'array',
        items: { type: 'object' },
    }),
    __metadata("design:type", Array)
], DeviceResponseDto.prototype, "pack_stats", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Team name',
        example: 'Engineering',
        nullable: true,
    }),
    __metadata("design:type", String)
], DeviceResponseDto.prototype, "team_name", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Users',
        type: 'array',
        items: { type: 'object' },
    }),
    __metadata("design:type", Array)
], DeviceResponseDto.prototype, "users", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Disk space available in GB', example: 250.5 }),
    __metadata("design:type", Number)
], DeviceResponseDto.prototype, "gigs_disk_space_available", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Percent disk space available', example: 75.2 }),
    __metadata("design:type", Number)
], DeviceResponseDto.prototype, "percent_disk_space_available", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Total disk space in GB', example: 500.0 }),
    __metadata("design:type", Number)
], DeviceResponseDto.prototype, "gigs_total_disk_space", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Disk encryption enabled', example: true }),
    __metadata("design:type", Boolean)
], DeviceResponseDto.prototype, "disk_encryption_enabled", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Issues',
        type: 'object',
        additionalProperties: true,
    }),
    __metadata("design:type", Object)
], DeviceResponseDto.prototype, "issues", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'MDM info',
        type: 'object',
        additionalProperties: true,
    }),
    __metadata("design:type", Object)
], DeviceResponseDto.prototype, "mdm", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Refetch critical queries until',
        example: '2024-01-20T00:00:00Z',
        nullable: true,
    }),
    __metadata("design:type", String)
], DeviceResponseDto.prototype, "refetch_critical_queries_until", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Last restarted at',
        example: '2024-01-10T08:00:00Z',
    }),
    __metadata("design:type", String)
], DeviceResponseDto.prototype, "last_restarted_at", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Policies', type: [FleetPolicyDto] }),
    __metadata("design:type", Array)
], DeviceResponseDto.prototype, "policies", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Labels',
        type: 'array',
        items: { type: 'object' },
    }),
    __metadata("design:type", Array)
], DeviceResponseDto.prototype, "labels", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Packs',
        type: 'array',
        items: { type: 'object' },
    }),
    __metadata("design:type", Array)
], DeviceResponseDto.prototype, "packs", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Batteries',
        type: 'array',
        items: { type: 'object' },
    }),
    __metadata("design:type", Array)
], DeviceResponseDto.prototype, "batteries", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'End users',
        type: 'array',
        items: { type: 'object' },
    }),
    __metadata("design:type", Array)
], DeviceResponseDto.prototype, "end_users", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Last MDM enrolled at',
        example: '2024-01-01T00:00:00Z',
    }),
    __metadata("design:type", String)
], DeviceResponseDto.prototype, "last_mdm_enrolled_at", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Last MDM checked in at',
        example: '2024-01-15T12:00:00Z',
    }),
    __metadata("design:type", String)
], DeviceResponseDto.prototype, "last_mdm_checked_in_at", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Device status', example: 'online' }),
    __metadata("design:type", String)
], DeviceResponseDto.prototype, "status", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Display text', example: 'Johns MacBook Pro' }),
    __metadata("design:type", String)
], DeviceResponseDto.prototype, "display_text", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Display name', example: "John's MacBook Pro" }),
    __metadata("design:type", String)
], DeviceResponseDto.prototype, "display_name", void 0);
//# sourceMappingURL=device-responses.dto.js.map