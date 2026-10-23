import type {
  MapleAlertDestination,
  MapleAlertRule,
  MapleApiKey,
  MapleAuditLogEntry,
  MapleService,
} from '../types';

export const makeRule = (overrides: Partial<MapleAlertRule> = {}): MapleAlertRule => ({
  id: 'alrt_1',
  object: 'alert_rule',
  name: 'High error rate',
  enabled: true,
  severity: 'critical',
  signal_type: 'error_rate',
  service_names: [],
  exclude_service_names: [],
  environments: [],
  comparator: 'gt',
  threshold: 0.05,
  window_minutes: 5,
  destination_ids: ['dest_1'],
  last_evaluation_error: null,
  last_evaluated_at: '2026-10-08T12:00:00.000Z',
  created_at: '2026-01-01T00:00:00.000Z',
  updated_at: '2026-01-01T00:00:00.000Z',
  ...overrides,
});

export const makeDestination = (
  overrides: Partial<MapleAlertDestination> = {},
): MapleAlertDestination => ({
  id: 'dest_1',
  object: 'alert_destination',
  name: 'On-call Slack',
  type: 'chat',
  enabled: true,
  summary: '#oncall',
  last_tested_at: null,
  last_test_error: null,
  created_at: '2026-01-01T00:00:00.000Z',
  ...overrides,
});

export const makeService = (overrides: Partial<MapleService> = {}): MapleService => ({
  object: 'service',
  name: 'checkout',
  service_namespaces: [],
  deployment_environments: ['production'],
  throughput: 10,
  span_count: 1000,
  error_count: 2,
  error_rate: 0.002,
  p95_latency_ms: 120,
  ...overrides,
});

export const makeApiKey = (overrides: Partial<MapleApiKey> = {}): MapleApiKey => ({
  id: 'key_1',
  object: 'api_key',
  name: 'ci',
  key_prefix: 'maple_ak_9f2c',
  kind: 'standard',
  scopes: ['alerts:read'],
  revoked: false,
  revoked_at: null,
  last_used_at: new Date().toISOString(),
  expires_at: null,
  created_at: new Date().toISOString(),
  created_by_email: 'ci@example.com',
  ...overrides,
});

export const makeAuditEntry = (
  overrides: Partial<MapleAuditLogEntry> = {},
): MapleAuditLogEntry => ({
  id: 'alog_1',
  object: 'audit_log_entry',
  action: 'alert_rule.updated',
  outcome: 'allowed',
  denial_reason: null,
  actor_type: 'user',
  actor_id: 'user_1',
  actor_name: 'Dana',
  source: 'dashboard',
  resource_type: 'alert_rule',
  resource_id: 'alrt_1',
  origin_ip: null,
  occurred_at: new Date().toISOString(),
  ...overrides,
});
