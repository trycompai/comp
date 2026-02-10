import PageWithBreadcrumb from '@/components/pages/PageWithBreadcrumb';
import { serverApi } from '@/lib/api-server';
import { Role } from '@db';
import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { AuditorView } from './components/AuditorView';

function parseRolesString(rolesStr: string | null | undefined): Role[] {
  if (!rolesStr) return [];
  return rolesStr
    .split(',')
    .map((r) => r.trim())
    .filter((r) => r in Role) as Role[];
}

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
  const { orgId: organizationId } = await params;

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

  const roles = parseRolesString(currentMember.role);
  if (!roles.includes(Role.auditor)) {
    notFound();
  }

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
    <PageWithBreadcrumb
      breadcrumbs={[
        {
          label: 'Auditor View',
          href: `/${organizationId}/auditor`,
          current: true,
        },
      ]}
    >
      <AuditorView
        initialContent={initialContent}
        organizationName={organizationName}
        logoUrl={logoUrl}
        employeeCount={
          initialContent['How many employees do you have?'] || null
        }
        cSuite={cSuiteData}
        reportSignatory={signatoryData}
      />
    </PageWithBreadcrumb>
  );
}
