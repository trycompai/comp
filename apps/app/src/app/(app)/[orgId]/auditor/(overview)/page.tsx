import { APP_AWS_ORG_ASSETS_BUCKET, s3Client } from '@/app/s3';
import PageWithBreadcrumb from '@/components/pages/PageWithBreadcrumb';
import { auth } from '@/utils/auth';
import { GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { db, Role } from '@db';
import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { notFound, redirect } from 'next/navigation';
import { AuditorView } from './components/AuditorView';

// Helper to safely parse comma-separated roles string
function parseRolesString(rolesStr: string | null | undefined): Role[] {
  if (!rolesStr) return [];
  return rolesStr
    .split(',')
    .map((r) => r.trim())
    .filter((r) => r in Role) as Role[];
}

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: 'Auditor View',
  };
}

export default async function AuditorPage({ params }: { params: Promise<{ orgId: string }> }) {
  const { orgId: organizationId } = await params;

  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    redirect('/auth');
  }

  const member = await db.member.findFirst({
    where: {
      userId: session.user.id,
      organizationId,
      deactivated: false,
    },
  });

  if (!member) {
    redirect('/auth/unauthorized');
  }

  const roles = parseRolesString(member.role);
  if (!roles.includes(Role.auditor)) {
    notFound();
  }

  // Fetch organization for name and logo
  const organization = await db.organization.findUnique({
    where: { id: organizationId },
    select: { name: true, logo: true },
  });

  // Get signed URL for logo if it exists
  let logoUrl: string | null = null;
  if (organization?.logo && s3Client && APP_AWS_ORG_ASSETS_BUCKET) {
    try {
      const command = new GetObjectCommand({
        Bucket: APP_AWS_ORG_ASSETS_BUCKET,
        Key: organization.logo,
      });
      logoUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 });
    } catch {
      // Logo not available
    }
  }

  // All context questions we need
  const CONTEXT_QUESTIONS = [
    // AI-generated sections
    'Company Background & Overview of Operations',
    'Types of Services Provided',
    'Mission & Vision',
    'System Description',
    'Critical Vendors',
    'Subservice Organizations',
    // Onboarding data
    'How many employees do you have?',
    'Who are your C-Suite executives?',
    'Who will sign off on the final report?',
  ];

  // Load existing content from Context
  const existingContext = await db.context.findMany({
    where: {
      organizationId,
      question: { in: CONTEXT_QUESTIONS },
    },
  });

  // Map question -> answer for the frontend
  const initialContent: Record<string, string> = {};
  for (const item of existingContext) {
    initialContent[item.question] = item.answer;
  }

  // Parse structured data
  let cSuiteData: { name: string; title: string }[] = [];
  let signatoryData: { fullName: string; jobTitle: string; email: string } | null = null;

  try {
    const cSuiteRaw = initialContent['Who are your C-Suite executives?'];
    if (cSuiteRaw) {
      cSuiteData = JSON.parse(cSuiteRaw);
    }
  } catch {
    // Invalid JSON
  }

  try {
    const signatoryRaw = initialContent['Who will sign off on the final report?'];
    if (signatoryRaw) {
      signatoryData = JSON.parse(signatoryRaw);
    }
  } catch {
    // Invalid JSON
  }

  return (
    <PageWithBreadcrumb
      breadcrumbs={[{ label: 'Auditor View', href: `/${organizationId}/auditor`, current: true }]}
    >
      <AuditorView
        initialContent={initialContent}
        organizationName={organization?.name ?? 'Organization'}
        logoUrl={logoUrl}
        employeeCount={initialContent['How many employees do you have?'] || null}
        cSuite={cSuiteData}
        reportSignatory={signatoryData}
      />
    </PageWithBreadcrumb>
  );
}
