import { AppOnboarding } from '@/components/app-onboarding';
import { CreateRiskSheet } from '@/components/sheets/create-risk-sheet';
import { serverApi } from '@/lib/api-server';
import { PageHeader, PageLayout } from '@trycompai/design-system';
import type { Metadata } from 'next';
import { RisksTable } from './RisksTable';

interface RisksApiResponse {
  data: Array<{
    id: string;
    title: string;
    description: string;
    category: string;
    department: string | null;
    status: string;
    likelihood: string;
    impact: string;
    residualLikelihood: string;
    residualImpact: string;
    treatmentStrategy: string;
    treatmentStrategyDescription: string | null;
    organizationId: string;
    assigneeId: string | null;
    assignee: {
      id: string;
      user: {
        id: string;
        name: string | null;
        email: string;
        image: string | null;
      };
    } | null;
    createdAt: string;
    updatedAt: string;
  }>;
  totalCount: number;
  page: number;
  pageCount: number;
}

interface PeopleApiResponse {
  data: Array<{
    id: string;
    role: string;
    deactivated: boolean;
    user: {
      id: string;
      name: string | null;
      email: string;
      image: string | null;
    };
  }>;
}

export default async function RiskRegisterPage(props: {
  params: Promise<{ orgId: string }>;
  searchParams: Promise<Record<string, string>>;
}) {
  const { orgId } = await props.params;

  const [risksResult, peopleResult, onboardingResult] = await Promise.all([
    serverApi.get<RisksApiResponse>('/v1/risks?perPage=50'),
    serverApi.get<PeopleApiResponse>('/v1/people'),
    serverApi.get<{ triggerJobId: string | null; triggerJobCompleted: boolean } | null>(
      '/v1/organization/onboarding',
    ),
  ]);

  const risks = risksResult.data?.data ?? [];
  const pageCount = risksResult.data?.pageCount ?? 0;

  // Transform people response to assignees format expected by CreateRiskSheet.
  // Risk owners need write access to risks (risk:update) and the compliance
  // app (app:read). The built-in roles that grant both are `owner` and
  // `admin`; `auditor` is read-only (no update); `employee` and `contractor`
  // are portal-only. Custom roles can grant any combination of permissions,
  // so anyone with a non-built-in role is included — we can't resolve
  // permissions client-side and customers control their own role design.
  const PORTAL_ONLY_OR_READ_ROLES = new Set([
    'auditor',
    'employee',
    'contractor',
  ]);
  const canOwnRisks = (roleField: string): boolean => {
    const roles = roleField.split(',').map((r) => r.trim()).filter(Boolean);
    if (roles.length === 0) return false;
    return roles.some((r) => {
      if (r === 'owner' || r === 'admin') return true;
      if (PORTAL_ONLY_OR_READ_ROLES.has(r)) return false;
      // Custom role — trust the org's role design.
      return true;
    });
  };
  const assignees = (peopleResult.data?.data ?? [])
    .filter((p) => !p.deactivated && canOwnRisks(p.role))
    .map((p) => ({
      id: p.id,
      role: p.role,
      deactivated: p.deactivated,
      user: p.user,
      organizationId: orgId,
      isActive: true,
      userId: p.user.id,
      createdAt: new Date(),
      updatedAt: new Date(),
    }));

  const onboarding = onboardingResult.data;
  const isEmpty = risks.length === 0;
  const isOnboardingActive = Boolean(onboarding?.triggerJobId);

  if (isEmpty && !isOnboardingActive) {
    return (
      <PageLayout padding="sm" container={false}>
        <PageHeader title="Risks" actions={<CreateRiskSheet assignees={assignees as any} />} />
        <AppOnboarding
          title={'Risk Management'}
          description={
            "Identify, assess, and mitigate risks to protect your organization's assets and ensure compliance."
          }
          cta={'Create risk'}
          imageSrcLight="/onboarding/risk-light.webp"
          imageSrcDark="/onboarding/risk-dark.webp"
          imageAlt="Risk Management"
          sheetName="create-risk-sheet"
          faqs={[
            {
              questionKey: 'What is risk management?',
              answerKey:
                "Risk management is the process of identifying, assessing, and controlling threats to an organization's capital and earnings.",
            },
            {
              questionKey: 'Why is risk management important?',
              answerKey:
                'It helps organizations protect their assets, ensure stability, and achieve their objectives by minimizing potential disruptions.',
            },
            {
              questionKey: 'What are the key steps in risk management?',
              answerKey:
                'The key steps are risk identification, risk analysis, risk evaluation, risk treatment, and risk monitoring and review.',
            },
          ]}
        />
      </PageLayout>
    );
  }

  return (
    <PageLayout>
      <PageHeader title="Risks" actions={<CreateRiskSheet assignees={assignees as any} />} />
      <RisksTable
        risks={risks as any}
        pageCount={pageCount}
        assignees={assignees as any}
        onboardingRunId={onboarding?.triggerJobId ?? null}
        orgId={orgId}
      />
    </PageLayout>
  );
}

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: 'Risks',
  };
}
