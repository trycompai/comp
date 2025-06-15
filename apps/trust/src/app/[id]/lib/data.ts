"use server";

import { db } from "@comp/db";
import { cache } from "react";

export const findOrganizationByAnyId = cache(async (id: string) => {
  const trust = await db.trust.findFirst({
    where: {
      OR: [{ organizationId: id }, { friendlyUrl: id }, { domain: id }],
      status: "published",
    },
    select: {
      organizationId: true,
    },
  });

  if (!trust) return null;

  const organization = await db.organization.findFirst({
    where: {
      id: trust.organizationId,
      trust: {
        some: {
          status: "published",
        },
      },
    },
    include: {
      trust: {
        select: {
          status: true,
          domain: true,
          domainVerified: true,
          friendlyUrl: true,
        },
      },
    },
  });

  return organization;
});

export const getPublishedPolicies = cache(async (id: string) => {
  const organization = await findOrganizationByAnyId(id);

  if (!organization) {
    return null;
  }

  const policies = await db.policy.findMany({
    where: { organizationId: organization.id, status: "published" },
    select: {
      id: true,
      name: true,
      status: true,
    },
  });

  return policies;
});

export const getPublishedPolicy = cache(
  async (id: string, policyId: string) => {
    const organization = await findOrganizationByAnyId(id);

    if (!organization) {
      return null;
    }

    const policy = await db.policy.findFirst({
      where: {
        organizationId: organization.id,
        status: "published",
        id: policyId,
      },
      select: {
        id: true,
        name: true,
        status: true,
      },
    });

    return policy;
  },
);

export const getPublishedControls = cache(async (id: string) => {
  const organization = await findOrganizationByAnyId(id);

  if (!organization) {
    return null;
  }

  const controls = await db.task.findMany({
    where: { organizationId: organization.id, status: "done" },
    select: {
      id: true,
      title: true,
      status: true,
    },
  });

  return controls;
});

export const getFrameworks = cache(async (id: string) => {
  const organization = await findOrganizationByAnyId(id);

  if (!organization) {
    return null;
  }

  const frameworks = await db.trust.findFirst({
    where: { organizationId: organization.id },
    select: {
      soc2: true,
      iso27001: true,
      gdpr: true,
      soc2_status: true,
      iso27001_status: true,
      gdpr_status: true,
    },
  });

  return {
    soc2: {
      enabled: frameworks?.soc2,
      status: frameworks?.soc2_status,
    },
    iso27001: {
      enabled: frameworks?.iso27001,
      status: frameworks?.iso27001_status,
    },
    gdpr: {
      enabled: frameworks?.gdpr,
      status: frameworks?.gdpr_status,
    },
  };
});
