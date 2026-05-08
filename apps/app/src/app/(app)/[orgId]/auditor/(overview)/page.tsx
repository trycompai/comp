import { serverApi } from '@/lib/api-server';
import { parseRolesString } from '@/lib/permissions';
import { PageHeader, PageLayout } from '@trycompai/design-system';
import { Role } from '@db';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { AuditorView } from './components/AuditorView';
import { ExportEvidenceButton } from './components/ExportEvidenceButton';

interface PeopleMember {
  userId: string;
  role: string;
}

interface PeopleApiResponse {
  data: PeopleMember[];
  authenticatedUser?: { id: string; email: string };
}

interface OrgResponse {
  name: string;
  logoUrl: string | null;
}

interface ContextEntry {
  question: string;
  answer: string;
}

interface ContextApiResponse {
  data: ContextEntry[];
}

const CONTEXT_QUESTIONS = [
  'Company Background & Overview of Operations',
  'Types of Services Provided',
  'Mission & Vision',
  'System Description',
  'Critical Vendors',
  'Subservice Organizations',
  'How many employees do you have?',
  'Who are your C-Suite executives?',
  'Who will sign off on the final report?',
];

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: 'Auditor View',
  };
}

export default async function AuditorPage({
  params,
}: {
  params: Promise<{ orgId: string }>;
}) {
  await params;

  const [membersRes, orgRes, contextRes] = await Promise.all([
    serverApi.get<PeopleApiResponse>('/v1/people'),
    serverApi.get<OrgResponse>('/v1/organization'),
    serverApi.get<ContextApiResponse>('/v1/context'),
  ]);

  if (!membersRes.data) {
    redirect('/auth');
  }

  const currentUserId = membersRes.data.authenticatedUser?.id;
  const currentMember = (membersRes.data.data ?? []).find(
    (m) => m.userId === currentUserId,
  );

  if (!currentMember) {
    redirect('/auth/unauthorized');
  }

  // CS-189: auditor/layout.tsx already calls requireRoutePermission('auditor',
  // orgId) which enforces audit:read. The prior literal-role check
  // (roles.includes(Role.auditor)) was redundant AND wrong — it would 404 for
  // owners/admins/custom roles that legitimately have audit:read.

  const organizationName = orgRes.data?.name ?? 'Organization';
  const logoUrl = orgRes.data?.logoUrl ?? null;

  // Filter context entries to the questions we need
  const allContext = Array.isArray(contextRes.data?.data)
    ? contextRes.data.data
    : [];
  const initialContent: Record<string, string> = {};
  for (const item of allContext) {
    if (CONTEXT_QUESTIONS.includes(item.question)) {
      initialContent[item.question] = item.answer;
    }
  }

  // Parse structured data
  let cSuiteData: { name: string; title: string }[] = [];
  let signatoryData: {
    fullName: string;
    jobTitle: string;
    email: string;
  } | null = null;

  try {
    const cSuiteRaw = initialContent['Who are your C-Suite executives?'];
    if (cSuiteRaw) {
      cSuiteData = JSON.parse(cSuiteRaw);
    }
  } catch {
    // Invalid JSON
  }

  try {
    const signatoryRaw =
      initialContent['Who will sign off on the final report?'];
    if (signatoryRaw) {
      signatoryData = JSON.parse(signatoryRaw);
    }
  } catch {
    // Invalid JSON
  }

  return (
    <PageLayout
      header={
        <PageHeader
          title={organizationName}
          actions={<ExportEvidenceButton organizationName={organizationName} />}
        />
      }
    >
      <AuditorView
        initialContent={initialContent}
        logoUrl={logoUrl}
        organizationName={organizationName}
        employeeCount={initialContent['How many employees do you have?'] || null}
        cSuite={cSuiteData}
        reportSignatory={signatoryData}
      />
    </PageLayout>
  );
}
