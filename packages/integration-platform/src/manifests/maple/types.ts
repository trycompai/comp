/**
 * Maple v2 API types.
 *
 * Only the fields the checks read are typed. Full reference:
 * https://api.maple.dev/v2/docs
 */

/** Stripe-style list envelope returned by every v2 list endpoint */
export interface MapleList<T> {
  object: 'list';
  data: T[];
  has_more: boolean;
  next_cursor: string | null;
}

export type MapleAlertSignalType =
  | 'error_rate'
  | 'p95_latency'
  | 'p99_latency'
  | 'apdex'
  | 'throughput'
  | 'builder_query'
  | 'raw_query';

export interface MapleAlertRule {
  id: string;
  object: 'alert_rule';
  name: string;
  enabled: boolean;
  severity: 'warning' | 'critical';
  signal_type: MapleAlertSignalType;
  /** Empty means the rule applies to every service */
  service_names: string[];
  exclude_service_names: string[];
  /** Empty means the rule applies to every environment */
  environments: string[];
  comparator: string;
  threshold: number;
  window_minutes: number;
  destination_ids: string[];
  last_evaluation_error: string | null;
  last_evaluated_at: string | null;
  created_at: string;
  updated_at: string;
}

export type MapleAlertDestinationType =
  'pagerduty' | 'webhook' | 'hazel-oauth' | 'discord' | 'telegram' | 'email' | 'chat';

export interface MapleAlertDestination {
  id: string;
  object: 'alert_destination';
  name: string;
  type: MapleAlertDestinationType;
  enabled: boolean;
  summary: string;
  last_tested_at: string | null;
  last_test_error: string | null;
  created_at: string;
}

export interface MapleService {
  object: 'service';
  name: string;
  service_namespaces: string[];
  deployment_environments: string[];
  throughput: number;
  span_count: number;
  error_count: number;
  error_rate: number;
  p95_latency_ms: number;
}

export interface MapleApiKey {
  id: string;
  object: 'api_key';
  name: string;
  key_prefix: string;
  kind: 'standard' | 'mcp';
  /** null means the key has full access */
  scopes: string[] | null;
  revoked: boolean;
  revoked_at: string | null;
  last_used_at: string | null;
  expires_at: string | null;
  created_at: string;
  created_by_email: string | null;
}

export interface MapleAuditLogEntry {
  id: string;
  object: 'audit_log_entry';
  action: string;
  outcome: 'allowed' | 'denied';
  denial_reason: string | null;
  actor_type: 'user' | 'api_key' | 'agent' | 'system';
  actor_id: string | null;
  actor_name: string | null;
  source: string;
  resource_type: string;
  resource_id: string | null;
  origin_ip: string | null;
  occurred_at: string;
}

/** Credential fields collected on the connect form */
export interface MapleCredentials {
  api_key: string;
  region?: 'us' | 'eu';
  base_url?: string;
}
