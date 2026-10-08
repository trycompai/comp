/**
 * Maple Integration Manifest
 *
 * Maple is an OpenTelemetry observability platform (traces, logs, metrics, alerts).
 * Checks read the Maple v2 API with a read-only scoped API key.
 *
 * API Documentation: https://api.maple.dev/v2/docs
 */

import type { IntegrationManifest } from '../../types';
import { MAPLE_US_API_URL } from './api';
import {
  apiKeyHygieneCheck,
  appAvailabilityCheck,
  auditLogEvidenceCheck,
  monitoringAlertingCheck,
} from './checks';

export const mapleManifest: IntegrationManifest = {
  id: 'maple',
  name: 'Maple',
  description:
    'Connect Maple to verify production services are monitored, alerts reach your team, and API keys are managed.',
  category: 'Monitoring',
  logoUrl: 'https://img.logo.dev/maple.dev?token=pk_AZatYxV5QDSfWpRDaBxzRQ',
  docsUrl: 'https://api.maple.dev/v2/docs',

  baseUrl: MAPLE_US_API_URL,
  defaultHeaders: {
    Accept: 'application/json',
  },

  auth: {
    type: 'api_key',
    config: { in: 'header', name: 'Authorization', prefix: 'Bearer ' },
  },

  credentialFields: [
    {
      id: 'api_key',
      label: 'API Key',
      type: 'password',
      required: true,
      placeholder: 'maple_ak_...',
      pattern: '^maple_ak_',
      helpText:
        'In Maple, open Settings → API Keys → Create key. Restrict it to read access for Alerts, Services, API keys, and Audit log.',
    },
    {
      id: 'region',
      label: 'Region',
      type: 'select',
      required: true,
      defaultValue: 'us',
      helpText:
        'The region your Maple organization is hosted in. EU organizations use eu.maple.dev.',
      options: [
        { value: 'us', label: 'US (maple.dev)' },
        { value: 'eu', label: 'EU (eu.maple.dev)' },
      ],
    },
    {
      id: 'base_url',
      label: 'Self-hosted API URL',
      type: 'url',
      required: false,
      placeholder: 'https://maple-api.example.com',
      helpText: 'Only for self-hosted Maple. Leave empty for Maple Cloud. Must use https://.',
    },
  ],

  capabilities: ['checks'],

  services: [
    {
      id: 'alerting',
      name: 'Alerting',
      description: 'Alert rules are enabled, healthy, and routed to a destination',
      enabledByDefault: true,
      implemented: true,
    },
    {
      id: 'availability',
      name: 'Availability Monitoring',
      description: 'Services report telemetry and are covered by availability alerts',
      enabledByDefault: true,
      implemented: true,
    },
    {
      id: 'access',
      name: 'Access & Audit',
      description: 'API key hygiene and audit log evidence',
      enabledByDefault: true,
      implemented: true,
    },
  ],

  checks: [
    monitoringAlertingCheck,
    appAvailabilityCheck,
    apiKeyHygieneCheck,
    auditLogEvidenceCheck,
  ],

  isActive: true,
};

export default mapleManifest;
export * from './types';
