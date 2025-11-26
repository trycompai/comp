'use server';

import { auth } from '@/utils/auth';
import { db } from '@db';
import { headers } from 'next/headers';
import 'server-only';

/**
 * Get SOA documents for an organization
 */
export const getSOADocuments = async (organizationId: string) => {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.session?.activeOrganizationId || session.session.activeOrganizationId !== organizationId) {
    return [];
  }

  const documents = await db.sOADocument.findMany({
    where: {
      organizationId,
    },
    include: {
      framework: true,
      configuration: true,
      answers: {
        where: {
          isLatestAnswer: true,
        },
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  // Fetch approver members for documents pending approval
  const approverMemberIds = documents
    .map((doc: { approverId: string | null | undefined }) => doc.approverId)
    .filter((id: string | null | undefined): id is string => id !== null && id !== undefined && typeof id === 'string');

  const approvers = approverMemberIds.length > 0
    ? await db.member.findMany({
        where: { id: { in: approverMemberIds } },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      })
    : [];

  const approversMap = new Map(approvers.map((m) => [m.id, m]));

  // Attach approver data to documents
  return documents.map((doc: { approverId: string | null }) => ({
    ...doc,
    approver: doc.approverId ? approversMap.get(doc.approverId) || null : null,
  }));
};

/**
 * Get frameworks that have SOA configurations
 */
export const getFrameworksWithSOAConfig = async () => {
  // Get all visible frameworks
  const allFrameworks = await db.frameworkEditorFramework.findMany({
    where: {
      visible: true,
    },
  });

  // Check which ones have SOA configurations
  const frameworksWithSOA = await Promise.all(
    allFrameworks.map(async (framework) => {
      const config = await db.sOAFrameworkConfiguration.findFirst({
        where: {
          frameworkId: framework.id,
          isLatest: true,
        },
      });

      if (!config) return null;

      return {
        ...framework,
        soaConfiguration: config,
      };
    }),
  );

  return frameworksWithSOA.filter((f) => f !== null);
};

/**
 * Check if a framework has SOA configuration
 */
export const hasSOAConfiguration = async (frameworkId: string): Promise<boolean> => {
  const config = await db.sOAFrameworkConfiguration.findFirst({
    where: {
      frameworkId,
      isLatest: true,
    },
  });

  return !!config;
};

/**
 * Get the latest SOA configuration for a framework
 */
export const getLatestSOAConfiguration = async (frameworkId: string) => {
  const config = await db.sOAFrameworkConfiguration.findFirst({
    where: {
      frameworkId,
      isLatest: true,
    },
  });

  return config;
};

/**
 * Get organization's framework instances that support SOA
 */
export const getOrganizationFrameworksWithSOA = async (organizationId: string) => {
  // Get organization's framework instances
  const frameworkInstances = await db.frameworkInstance.findMany({
    where: {
      organizationId,
    },
    include: {
      framework: true,
    },
  });

  // Check which frameworks have SOA configurations
  const frameworksWithSOA = await Promise.all(
    frameworkInstances.map(async (instance) => {
      const config = await db.sOAFrameworkConfiguration.findFirst({
        where: {
          frameworkId: instance.frameworkId,
          isLatest: true,
        },
      });

      if (!config) return null;

      return {
        ...instance,
        soaConfiguration: config,
      };
    }),
  );

  return frameworksWithSOA.filter((f) => f !== null);
};

/**
 * Get frameworks with their latest SOA documents for an organization
 * Returns all frameworks that have SOA configurations, whether or not the org has instances
 */
export const getFrameworksWithLatestDocuments = async (organizationId: string) => {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.session?.activeOrganizationId || session.session.activeOrganizationId !== organizationId) {
    return [];
  }

  // Get all frameworks that have SOA configurations (not just org's instances)
  const frameworksWithConfigs = await db.sOAFrameworkConfiguration.findMany({
    where: {
      isLatest: true,
    },
    include: {
      framework: true,
    },
  });

  // Filter out configs without frameworks or with invisible frameworks, and get documents for each
  const frameworksWithData = await Promise.all(
    frameworksWithConfigs
      .filter((config: { framework: { visible: boolean } | null }) => config.framework && config.framework.visible)
      .map(async (config: { frameworkId: string; framework: { id: string; name: string; description: string | null } | null; id: string; columns: unknown; questions: unknown }) => {
        // Get the latest document for this framework and organization
        const latestDocument = await db.sOADocument.findFirst({
          where: {
            frameworkId: config.frameworkId,
            organizationId,
            isLatest: true,
          },
          include: {
            answers: {
              where: {
                isLatestAnswer: true,
              },
            },
          },
          orderBy: {
            createdAt: 'desc',
          },
        });

        return {
          framework: config.framework!,
          frameworkId: config.frameworkId,
          configuration: config,
          document: latestDocument,
        };
      }),
  );

  return frameworksWithData;
};

/**
 * Get all organization's framework instances with their SOA data
 */
export const getOrganizationFrameworksWithSOAData = async (organizationId: string) => {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.session?.activeOrganizationId || session.session.activeOrganizationId !== organizationId) {
    return [];
  }

  const frameworkInstances = await db.frameworkInstance.findMany({
    where: {
      organizationId,
    },
    include: {
      framework: true,
    },
  });

  const validInstances = frameworkInstances.filter((fi) => fi.framework !== null);
  
  // Sort: supported frameworks first (ISO 27001), then others
  const supportedFrameworkNames = ['ISO 27001', 'iso27001', 'ISO27001'];
  
  const sortedInstances = validInstances.sort((a, b) => {
    const aName = (a as { framework: { name: string } | null }).framework?.name || '';
    const bName = (b as { framework: { name: string } | null }).framework?.name || '';
    
    const aIsSupported = supportedFrameworkNames.includes(aName);
    const bIsSupported = supportedFrameworkNames.includes(bName);
    
    if (aIsSupported && !bIsSupported) return -1;
    if (!aIsSupported && bIsSupported) return 1;
    return 0;
  });

  // Get SOA configurations and documents for each framework
  const frameworksWithData = await Promise.all(
    sortedInstances.map(async (instance) => {
      const framework = (instance as { framework: { id: string; name: string; description: string | null } | null }).framework;
      if (!framework) return null;

      const configuration = await db.sOAFrameworkConfiguration.findFirst({
        where: {
          frameworkId: framework.id,
          isLatest: true,
        },
      });

      const document = await db.sOADocument.findFirst({
        where: {
          frameworkId: framework.id,
          organizationId,
          isLatest: true,
        },
        include: {
          answers: {
            where: {
              isLatestAnswer: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      return {
        frameworkId: instance.frameworkId,
        framework,
        configuration,
        document,
      };
    }),
  );

  return frameworksWithData.filter((f) => f !== null);
};

/**
 * Get all organization's framework instances
 */
export const getOrganizationFrameworks = async (organizationId: string) => {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.session?.activeOrganizationId || session.session.activeOrganizationId !== organizationId) {
    return [];
  }

  const frameworkInstances = await db.frameworkInstance.findMany({
    where: {
      organizationId,
    },
    include: {
      framework: true,
    },
    orderBy: {
      id: 'desc',
    },
  });

  const validInstances = frameworkInstances.filter((fi) => fi.framework !== null);
  
  // Sort: supported frameworks first (ISO 27001), then others
  const supportedFrameworkNames = ['ISO 27001', 'iso27001', 'ISO27001'];
  
  return validInstances.sort((a, b) => {
    const aName = (a as { framework: { name: string } | null }).framework?.name || '';
    const bName = (b as { framework: { name: string } | null }).framework?.name || '';
    
    const aIsSupported = supportedFrameworkNames.includes(aName);
    const bIsSupported = supportedFrameworkNames.includes(bName);
    
    if (aIsSupported && !bIsSupported) return -1;
    if (!aIsSupported && bIsSupported) return 1;
    return 0;
  });
};
