/**
 * Integration definitions for the integrations directory
 *
 * SCALING STRATEGY:
 * - Integrations organized by category in separate files
 * - Each category file stays < 500 lines for LLM-friendliness
 * - Import and merge here for single source of truth
 * - Easy to add new integrations category-by-category
 */

import { cloudIntegrations } from './categories/cloud';
import { communicationIntegrations } from './categories/communication';
import { developmentIntegrations } from './categories/development';
import { hrIntegrations } from './categories/hr';
import { identityIntegrations } from './categories/identity';
import { infrastructureIntegrations } from './categories/infrastructure';
import { monitoringIntegrations } from './categories/monitoring';

export interface Integration {
  id: string;
  name: string;
  domain: string;
  description: string;
  category: IntegrationCategory;
  examplePrompts: string[];
  setupHint?: string;
  popular?: boolean;
}

export type IntegrationCategory =
  | 'Identity & Access'
  | 'HR & People'
  | 'Cloud Security'
  | 'Development'
  | 'Communication'
  | 'Monitoring'
  | 'Infrastructure';

/**
 * All integrations - merged from category files
 * Total integrations will grow as we add more categories
 */
export const INTEGRATIONS: Integration[] = [
  ...identityIntegrations,
  ...hrIntegrations,
  ...cloudIntegrations,
  ...developmentIntegrations,
  ...communicationIntegrations,
  ...monitoringIntegrations,
  ...infrastructureIntegrations,
];

export const CATEGORIES: IntegrationCategory[] = [
  'Identity & Access',
  'HR & People',
  'Cloud Security',
  'Development',
  'Communication',
  'Monitoring',
  'Infrastructure',
];
