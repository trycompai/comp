import { auth } from "@/utils/auth";
import { db } from "@comp/db";
import { headers } from "next/headers";
import { TestsLayout } from "./components/TestsLayout";

export default async function TestsDashboard() {
  const tests = await getTests();
  const cloudProviders = await getCloudProviders();

  const awsTests = tests.filter(
    (test) => test.integration.integrationId === "aws",
  );
  const gcpTests = tests.filter(
    (test) => test.integration.integrationId === "gcp",
  );
  const azureTests = tests.filter(
    (test) => test.integration.integrationId === "azure",
  );

  return (
    <TestsLayout
      cloudProviders={cloudProviders}
      awsTests={awsTests}
      gcpTests={gcpTests}
      azureTests={azureTests}
    />
  );
}

const getTests = async () => {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    return [];
  }

  const orgId = session.session?.activeOrganizationId;
  if (!orgId) {
    return [];
  }

  const tests = await db.integrationResult.findMany({
    where: {
      organizationId: orgId,
      integration: {
        integrationId: {
          in: ["aws", "gcp", "azure"],
        },
      },
    },
    select: {
      id: true,
      title: true,
      completedAt: true,
      description: true,
      status: true,
      severity: true,
      remediation: true,
      integration: {
        select: {
          integrationId: true,
        },
      },
    },
  });

  return tests || [];
};

const getCloudProviders = async () => {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    return [];
  }

  const orgId = session.session?.activeOrganizationId;

  if (!orgId) {
    return [];
  }

  const cloudProviders = await db.integration.findMany({
    where: {
      organizationId: orgId,
      integrationId: {
        in: ["aws", "gcp", "azure"],
      },
    },
  });

  return cloudProviders;
};
