import PageWithBreadcrumb from '@/components/pages/PageWithBreadcrumb';
import { auth } from '@/utils/auth';
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

  // Auditor section questions that we look for in Context
  const SECTION_QUESTIONS = [
    'Company Background & Overview of Operations',
    'Types of Services Provided',
    'Mission & Vision',
    'System Description',
    'Critical Vendors',
    'Subservice Organizations',
  ];

  // Load existing content from Context
  const existingContext = await db.context.findMany({
    where: {
      organizationId,
      question: { in: SECTION_QUESTIONS },
    },
  });

  // Map question -> answer for the frontend
  const initialContent: Record<string, string> = {};
  for (const item of existingContext) {
    initialContent[item.question] = item.answer;
  }

  return (
    <PageWithBreadcrumb
      breadcrumbs={[{ label: 'Auditor View', href: `/${organizationId}/auditor`, current: true }]}
    >
      <AuditorView orgId={organizationId} initialContent={initialContent} />
    </PageWithBreadcrumb>
  );
}
