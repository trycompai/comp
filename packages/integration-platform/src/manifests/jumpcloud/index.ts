/**
 * JumpCloud Integration Manifest
 *
 * This integration connects to JumpCloud to sync users as employees.
 * JumpCloud is an identity and access management platform that provides
 * a cloud directory for managing users, devices, and access.
 *
 * @see https://docs.jumpcloud.com/api/1.0/index.html
 * @see https://docs.jumpcloud.com/api/2.0/index.html
 */

import type { IntegrationManifest } from '../../types';
import { employeeSyncCheck } from './checks';

export const manifest: IntegrationManifest = {
  id: 'jumpcloud',
  name: 'JumpCloud',
  description: 'Sync users from JumpCloud as employees for access review and compliance.',
  category: 'Identity & Access',
  logoUrl: 'https://img.logo.dev/jumpcloud.com?token=pk_AZatYxV5QDSfWpRDaBxzRQ',
  docsUrl: 'https://docs.trycomp.ai/integrations/jumpcloud',

  // JumpCloud API v1 base URL (used for systemusers endpoint)
  // Note: trailing slash is required for proper URL construction
  baseUrl: 'https://console.jumpcloud.com/api/',
  defaultHeaders: {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  },

  auth: {
    type: 'api_key',
    config: {
      in: 'header',
      name: 'x-api-key',
    },
  },

  credentialFields: [
    {
      id: 'api_key',
      label: 'JumpCloud Admin API Key',
      type: 'password',
      required: true,
      placeholder: 'Your JumpCloud API key',
      helpText: 'https://jumpcloud.com/university/resources/guided-simulations/generating-a-new-api-key',
    },
  ],

  // Supports both checks and sync capabilities
  capabilities: ['checks', 'sync'],

  // Employee sync check
  checks: [employeeSyncCheck],

  isActive: true,
};

export default manifest;
export * from './types';
