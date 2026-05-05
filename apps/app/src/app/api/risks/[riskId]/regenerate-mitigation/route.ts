import { generateRiskMitigation } from '@/trigger/tasks/onboarding/generate-risk-mitigation';
import type { PolicyContext } from '@/trigger/tasks/onboarding/onboard-organization-helpers';
import { serverApi } from '@/lib/api-server';
import { requireApiPermission } from '@/lib/permissions.server';
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
    const ctx = await requireApiPermission(req, 'risk', 'update');
    if (ctx instanceof NextResponse) return ctx;
    const { organizationId } = ctx;

    const { riskId } = await params;
    if (!riskId) {
      return NextResponse.json(
        { error: 'Risk ID is required' },
        { status: 400 },
      );
    }

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

    // The run is now in flight server-side. Mint a 15-min public token so
    // the UI can subscribe via useRealtimeRun. If the mint fails, do NOT
    // throw — that would let a client retry start a duplicate run. Return
    // the runId with a null token; the UI's `/active` endpoint can mint a
    // fresh token on the next render. (Cubic finding #29 on PR #2671.)
    let publicAccessToken: string | null = null;
    try {
      publicAccessToken = await triggerAuth.createPublicToken({
        scopes: { read: { runs: [handle.id] } },
        expirationTime: '15m',
      });
    } catch (mintErr) {
      console.error(
        '[regenerate-mitigation] run triggered but token mint failed; client must resume via /active',
        { runId: handle.id, mintErr },
      );
    }

    return NextResponse.json({ runId: handle.id, publicAccessToken });
  } catch (error) {
    console.error('Error regenerating risk mitigation:', error);
    return NextResponse.json({ error: 'Failed to regenerate mitigation' }, { status: 500 });
  }
}
