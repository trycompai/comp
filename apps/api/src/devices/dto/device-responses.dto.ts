import { ApiProperty } from '@nestjs/swagger';

export class FleetPolicyDto {
  @ApiProperty({ description: 'Policy ID', example: 123 })
  id: number;

  @ApiProperty({ description: 'Policy name', example: 'Password Policy' })
  name: string;

  @ApiProperty({ description: 'Policy query', example: 'SELECT * FROM users;' })
  query: string;

  @ApiProperty({ description: 'Whether policy is critical', example: true })
  critical: boolean;

  @ApiProperty({
    description: 'Policy description',
    example: 'Ensures strong passwords',
  })
  description: string;

  @ApiProperty({ description: 'Author ID', example: 456 })
  author_id: number;

  @ApiProperty({ description: 'Author name', example: 'John Doe' })
  author_name: string;

  @ApiProperty({ description: 'Author email', example: 'john@example.com' })
  author_email: string;

  @ApiProperty({ description: 'Team ID', example: 789, nullable: true })
  team_id: number | null;

  @ApiProperty({
    description: 'Policy resolution',
    example: 'Update password settings',
  })
  resolution: string;

  @ApiProperty({ description: 'Platform', example: 'darwin' })
  platform: string;

  @ApiProperty({ description: 'Calendar events enabled', example: false })
  calendar_events_enabled: boolean;

  @ApiProperty({ description: 'Created at', example: '2024-01-01T00:00:00Z' })
  created_at: string;

  @ApiProperty({ description: 'Updated at', example: '2024-01-15T00:00:00Z' })
  updated_at: string;

  @ApiProperty({ description: 'Policy response', example: 'compliant' })
  response: string;
}

export class DeviceResponseDto {
  @ApiProperty({
    description: 'Device created at',
    example: '2024-01-01T00:00:00Z',
  })
  created_at: string;

  @ApiProperty({
    description: 'Device updated at',
    example: '2024-01-15T00:00:00Z',
  })
  updated_at: string;

  @ApiProperty({
    description: 'Software list',
    type: 'array',
    items: { type: 'object' },
  })
  software: object[];

  @ApiProperty({
    description: 'Software updated at',
    example: '2024-01-10T00:00:00Z',
  })
  software_updated_at: string;

  @ApiProperty({ description: 'Device ID', example: 123 })
  id: number;

  @ApiProperty({
    description: 'Detail updated at',
    example: '2024-01-10T00:00:00Z',
  })
  detail_updated_at: string;

  @ApiProperty({
    description: 'Label updated at',
    example: '2024-01-10T00:00:00Z',
  })
  label_updated_at: string;

  @ApiProperty({
    description: 'Policy updated at',
    example: '2024-01-10T00:00:00Z',
  })
  policy_updated_at: string;

  @ApiProperty({
    description: 'Last enrolled at',
    example: '2024-01-01T00:00:00Z',
  })
  last_enrolled_at: string;

  @ApiProperty({
    description: 'Last seen time',
    example: '2024-01-15T12:00:00Z',
  })
  seen_time: string;

  @ApiProperty({ description: 'Refetch requested', example: false })
  refetch_requested: boolean;

  @ApiProperty({ description: 'Hostname', example: 'johns-macbook' })
  hostname: string;

  @ApiProperty({ description: 'Device UUID', example: 'abc123def456' })
  uuid: string;

  @ApiProperty({ description: 'Platform', example: 'darwin' })
  platform: string;

  @ApiProperty({ description: 'Osquery version', example: '5.10.2' })
  osquery_version: string;

  @ApiProperty({ description: 'Orbit version', example: '1.19.0' })
  orbit_version: string;

  @ApiProperty({ description: 'Fleet desktop version', example: '1.19.0' })
  fleet_desktop_version: string;

  @ApiProperty({ description: 'Scripts enabled', example: true })
  scripts_enabled: boolean;

  @ApiProperty({ description: 'OS version', example: 'macOS 14.2.1' })
  os_version: string;

  @ApiProperty({ description: 'Build', example: '23C71' })
  build: string;

  @ApiProperty({ description: 'Platform like', example: 'darwin' })
  platform_like: string;

  @ApiProperty({ description: 'Code name', example: 'sonoma' })
  code_name: string;

  @ApiProperty({ description: 'Uptime in seconds', example: 86400 })
  uptime: number;

  @ApiProperty({ description: 'Memory in bytes', example: 17179869184 })
  memory: number;

  @ApiProperty({ description: 'CPU type', example: 'x86_64' })
  cpu_type: string;

  @ApiProperty({ description: 'CPU subtype', example: 'x86_64h' })
  cpu_subtype: string;

  @ApiProperty({
    description: 'CPU brand',
    example: 'Intel(R) Core(TM) i7-9750H',
  })
  cpu_brand: string;

  @ApiProperty({ description: 'CPU physical cores', example: 6 })
  cpu_physical_cores: number;

  @ApiProperty({ description: 'CPU logical cores', example: 12 })
  cpu_logical_cores: number;

  @ApiProperty({ description: 'Hardware vendor', example: 'Apple Inc.' })
  hardware_vendor: string;

  @ApiProperty({ description: 'Hardware model', example: 'MacBookPro16,1' })
  hardware_model: string;

  @ApiProperty({ description: 'Hardware version', example: '1.0' })
  hardware_version: string;

  @ApiProperty({ description: 'Hardware serial', example: 'C02XW0AAJGH6' })
  hardware_serial: string;

  @ApiProperty({ description: 'Computer name', example: "John's MacBook Pro" })
  computer_name: string;

  @ApiProperty({ description: 'Public IP', example: '203.0.113.1' })
  public_ip: string;

  @ApiProperty({ description: 'Primary IP', example: '192.168.1.100' })
  primary_ip: string;

  @ApiProperty({ description: 'Primary MAC', example: '00:11:22:33:44:55' })
  primary_mac: string;

  @ApiProperty({ description: 'Distributed interval', example: 10 })
  distributed_interval: number;

  @ApiProperty({ description: 'Config TLS refresh', example: 3600 })
  config_tls_refresh: number;

  @ApiProperty({ description: 'Logger TLS period', example: 300 })
  logger_tls_period: number;

  @ApiProperty({ description: 'Team ID', example: 1, nullable: true })
  team_id: number | null;

  @ApiProperty({
    description: 'Pack stats',
    type: 'array',
    items: { type: 'object' },
  })
  pack_stats: object[];

  @ApiProperty({
    description: 'Team name',
    example: 'Engineering',
    nullable: true,
  })
  team_name: string | null;

  @ApiProperty({
    description: 'Users',
    type: 'array',
    items: { type: 'object' },
  })
  users: object[];

  @ApiProperty({ description: 'Disk space available in GB', example: 250.5 })
  gigs_disk_space_available: number;

  @ApiProperty({ description: 'Percent disk space available', example: 75.2 })
  percent_disk_space_available: number;

  @ApiProperty({ description: 'Total disk space in GB', example: 500.0 })
  gigs_total_disk_space: number;

  @ApiProperty({ description: 'Disk encryption enabled', example: true })
  disk_encryption_enabled: boolean;

  @ApiProperty({
    description: 'Issues',
    type: 'object',
    additionalProperties: true,
  })
  issues: Record<string, unknown>;

  @ApiProperty({
    description: 'MDM info',
    type: 'object',
    additionalProperties: true,
  })
  mdm: Record<string, unknown>;

  @ApiProperty({
    description: 'Refetch critical queries until',
    example: '2024-01-20T00:00:00Z',
    nullable: true,
  })
  refetch_critical_queries_until: string | null;

  @ApiProperty({
    description: 'Last restarted at',
    example: '2024-01-10T08:00:00Z',
  })
  last_restarted_at: string;

  @ApiProperty({ description: 'Policies', type: [FleetPolicyDto] })
  policies: FleetPolicyDto[];

  @ApiProperty({
    description: 'Labels',
    type: 'array',
    items: { type: 'object' },
  })
  labels: object[];

  @ApiProperty({
    description: 'Packs',
    type: 'array',
    items: { type: 'object' },
  })
  packs: object[];

  @ApiProperty({
    description: 'Batteries',
    type: 'array',
    items: { type: 'object' },
  })
  batteries: object[];

  @ApiProperty({
    description: 'End users',
    type: 'array',
    items: { type: 'object' },
  })
  end_users: object[];

  @ApiProperty({
    description: 'Last MDM enrolled at',
    example: '2024-01-01T00:00:00Z',
  })
  last_mdm_enrolled_at: string;

  @ApiProperty({
    description: 'Last MDM checked in at',
    example: '2024-01-15T12:00:00Z',
  })
  last_mdm_checked_in_at: string;

  @ApiProperty({ description: 'Device status', example: 'online' })
  status: string;

  @ApiProperty({ description: 'Display text', example: 'Johns MacBook Pro' })
  display_text: string;

  @ApiProperty({ description: 'Display name', example: "John's MacBook Pro" })
  display_name: string;
}
