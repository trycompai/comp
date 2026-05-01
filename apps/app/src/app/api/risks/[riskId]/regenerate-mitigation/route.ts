import { generateRiskMitigation } from '@/trigger/tasks/onboarding/generate-risk-mitigation';
import type { PolicyContext } from '@/trigger/tasks/onboarding/onboard-organization-helpers';
import { serverApi } from '@/lib/api-server';
import { auth } from '@/utils/auth';
import { auth as triggerAuth, tasks } from '@trigger.dev/sdk';
import { NextRequest, NextResponse } from 'next/server';

interface PeopleApiResponse {
  data: Array<{
    id: string;
    role: string;
    deactivated: boolean;
    user: { id: string; name: string | null; email: string };
  }>;
}

interface PoliciesApiResponse {
  data: Array<{
    id: string;
    name: string;
    description: string | null;
  }>;
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ riskId: string }> },
) {
  try {
    const session = await auth.api.getSession({
      headers: req.headers,
    });

    if (!session?.session?.activeOrganizationId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { riskId } = await params;
    if (!riskId) {
      return NextResponse.json(
        { error: 'Risk ID is required' },
        { status: 400 },
      );
    }

    const organizationId = session.session.activeOrganizationId;

    const [peopleResult, policiesResult] = await Promise.all([
      serverApi.get<PeopleApiResponse>('/v1/people'),
      serverApi.get<PoliciesApiResponse>('/v1/policies'),
    ]);

    // Find first owner or admin as comment author
    const people = peopleResult.data?.data ?? [];
    const author = people.find(
      (p) =>
        !p.deactivated &&
        (p.role.includes('owner') || p.role.includes('admin')),
    );

    if (!author) {
      return NextResponse.json(
        { error: 'No eligible author found to regenerate the mitigation' },
        { status: 400 },
      );
    }

    const policyRows = policiesResult.data?.data ?? [];
    const policies: PolicyContext[] = policyRows.map((policy) => ({
      name: policy.name,
      description: policy.description,
    }));

    const handle = await tasks.trigger<typeof generateRiskMitigation>(
      'generate-risk-mitigation',
      {
        organizationId,
        riskId,
        authorId: author.id,
        policies,
      },
    );

    // Mint a 15-min public token so the UI can subscribe via useRealtimeRun
    // and show live progress while the LLM drafts the treatment plan.
    const publicAccessToken = await triggerAuth.createPublicToken({
      scopes: { read: { runs: [handle.id] } },
      expirationTime: '15m',
    });

    return NextResponse.json({ runId: handle.id, publicAccessToken });
  } catch (error) {
    console.error('Error regenerating risk mitigation:', error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Failed to regenerate mitigation',
      },
      { status: 500 },
    );
  }
}
