export interface FleetPolicy {
  id: number;
  name: string;
  query: string;
  critical: boolean;
  description: string;
  author_id: number;
  author_name: string;
  author_email: string;
  team_id: number | null;
  resolution: string;
  platform: string;
  calendar_events_enabled: boolean;
  created_at: string; // ISO date-time string
  updated_at: string; // ISO date-time string
  response: string;
}

export interface Host {
  created_at: string;
  updated_at: string;
  software: object[];
  software_updated_at: string;
  id: number;
  detail_updated_at: string;
  label_updated_at: string;
  policy_updated_at: string;
  last_enrolled_at: string;
  seen_time: string;
  refetch_requested: boolean;
  hostname: string;
  uuid: string;
  platform: string;
  osquery_version: string;
  orbit_version: string;
  fleet_desktop_version: string;
  scripts_enabled: boolean;
  os_version: string;
  build: string;
  platform_like: string;
  code_name: string;
  uptime: number;
  memory: number;
  cpu_type: string;
  cpu_subtype: string;
  cpu_brand: string;
  cpu_physical_cores: number;
  cpu_logical_cores: number;
  hardware_vendor: string;
  hardware_model: string;
  hardware_version: string;
  hardware_serial: string;
  computer_name: string;
  public_ip: string;
  primary_ip: string;
  primary_mac: string;
  distributed_interval: number;
  config_tls_refresh: number;
  logger_tls_period: number;
  team_id: number | null;
  pack_stats: object[];
  team_name: string | null;
  users: object[];
  gigs_disk_space_available: number;
  percent_disk_space_available: number;
  gigs_total_disk_space: number;
  disk_encryption_enabled: boolean;
  issues: object;
  mdm: MDM;
  refetch_critical_queries_until: string | null;
  last_restarted_at: string;
  policies: FleetPolicy[];
  labels: object[];
  packs: object[];
  batteries: object[];
  end_users: object[];
  last_mdm_enrolled_at: string;
  last_mdm_checked_in_at: string;
  status: string;
  display_text: string;
  display_name: string;
}

export type MDM = {
  connected_to_fleet: boolean;
  dep_profile_error: boolean;
  encryption_key_available: boolean;
  enrollment_status: string;
  name?: string;
  server_url?: string;
};
