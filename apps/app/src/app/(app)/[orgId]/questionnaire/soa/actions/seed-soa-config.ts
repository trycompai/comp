'use server';

import { db } from '@db';
import { loadISOConfig } from '../utils/transform-iso-config';
import 'server-only';

/**
 * Seeds SOA configuration for ISO 27001 framework
 * This creates the initial configuration if it doesn't exist
 */
export async function seedISO27001SOAConfig() {
  // Find ISO 27001 framework by name
  const iso27001Framework = await db.frameworkEditorFramework.findFirst({
    where: {
      OR: [
        { name: 'ISO 27001' },
        { name: 'iso27001' },
        { name: 'ISO27001' },
      ],
    },
  });

  if (!iso27001Framework) {
    throw new Error('ISO 27001 framework not found');
  }

  // Check if configuration already exists
  const existingConfig = await db.sOAFrameworkConfiguration.findFirst({
    where: {
      frameworkId: iso27001Framework.id,
      isLatest: true,
    },
  });

  if (existingConfig) {
    return existingConfig; // Return existing config
  }

  // Load and transform ISO config
  const soaConfig = await loadISOConfig();

  // Create new SOA configuration
  const newConfig = await db.sOAFrameworkConfiguration.create({
    data: {
      frameworkId: iso27001Framework.id,
      version: 1,
      isLatest: true,
      columns: soaConfig.columns,
      questions: soaConfig.questions,
    },
  });

  return newConfig;
}

