import type { SeedMetricDefinition } from './types';

/**
 * The nine seeded monitoring metrics (CS-723), active from day one. Names,
 * measured text, methods, cadences and targets follow the ticket and the
 * clause-9.1 reference document; the customer edits any field, deactivates a
 * metric, or adds custom ones. Seeding is idempotent by metricKey
 * (seedMetricsIfMissing) and never overwrites customer edits.
 */
export const SEED_METRIC_DEFINITIONS: SeedMetricDefinition[] = [
  {
    metricKey: 'training_completion',
    name: 'Security awareness training completion',
    whatIsMeasured:
      'Percentage of workforce members who have completed their assigned security-awareness training.',
    method:
      'Comp AI training tracker: completed assignments over total assigned, per campaign with monthly follow-up.',
    cadence: 'monthly',
    target: '95% completion or above',
  },
  {
    metricKey: 'vendor_review_currency',
    name: 'Vendor review currency',
    whatIsMeasured:
      'Percentage of critical vendors with an in-date security review and a signed DPA.',
    method:
      'Comp AI vendor register: critical vendors with a review inside its window and a signed DPA, over all critical vendors.',
    cadence: 'quarterly',
    target: '100% of critical vendors current',
  },
  {
    metricKey: 'finding_ageing',
    name: 'Open audit findings and corrective-action ageing',
    whatIsMeasured:
      'Count of open audit findings and the age of each open corrective action.',
    method:
      'Corrective-action records in Comp AI: open findings and days since each was raised, against its due date.',
    cadence: 'monthly',
    target: 'No corrective action open beyond its due date',
  },
  {
    metricKey: 'risk_treatment_status',
    name: 'Risk treatment status',
    whatIsMeasured:
      'Progress of risk treatment plans across the risk register.',
    method:
      'Comp AI risk register: risks by treatment status, highlighting high and critical risks without an active plan.',
    cadence: 'quarterly',
    target: 'All high and critical risks under active treatment',
  },
  {
    metricKey: 'policy_acknowledgement',
    name: 'Policy acknowledgement coverage',
    whatIsMeasured:
      'Percentage of workforce members who have acknowledged all policies assigned to them.',
    method:
      'Comp AI policy tracker: members with all assigned policies acknowledged, over all members with assignments.',
    cadence: 'quarterly',
    target: '95% acknowledgement coverage or above',
  },
  {
    metricKey: 'uptime',
    name: 'Production availability / uptime',
    whatIsMeasured: 'Availability of production services over the period.',
    method:
      'Cloud monitoring uptime reports (e.g. AWS / GCP / status page) for production services.',
    cadence: 'monthly',
    target: '99.9% availability or above',
  },
  {
    metricKey: 'vulnerability_remediation',
    name: 'Critical and High vulnerability remediation time',
    whatIsMeasured:
      'Time from detection to remediation for Critical and High severity vulnerabilities.',
    method:
      'SAST / SCA findings and tracker SLA timers: days from detection to closure per Critical/High vulnerability.',
    cadence: 'monthly',
    target: 'Critical within 7 days; High within 30 days',
  },
  {
    metricKey: 'unauthorised_access',
    name: 'Confirmed unauthorised-access incidents',
    whatIsMeasured:
      'Confirmed incidents of unauthorised access to customer or company data.',
    method:
      'Access logs, alerting and incident records: count of confirmed unauthorised-access incidents in the period.',
    cadence: 'monthly',
    target: '0 confirmed incidents',
  },
  {
    metricKey: 'incident_response_times',
    name: 'Incident time-to-acknowledge and time-to-contain',
    whatIsMeasured:
      'Time from detection to acknowledgement and to containment for security incidents.',
    method:
      'Incident records measured against the severity SLA: acknowledgement and containment timestamps per incident.',
    cadence: 'monthly',
    target: 'Within the severity SLA for every incident',
  },
];

/** Stable keys of the nine seeded metrics. */
export const SEED_METRIC_KEYS: string[] = SEED_METRIC_DEFINITIONS.map(
  (metric) => metric.metricKey,
);
