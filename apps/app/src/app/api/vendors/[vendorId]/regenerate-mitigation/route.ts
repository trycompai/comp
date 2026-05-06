import { generateVendorMitigation } from '@/trigger/tasks/onboarding/generate-vendor-mitigation';
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
  { params }: { params: Promise<{ vendorId: string }> },
) {
  try {
    const ctx = await requireApiPermission(req, 'vendor', 'update');
    if (ctx instanceof NextResponse) return ctx;
    const { organizationId } = ctx;

    const { vendorId } = await params;
    if (!vendorId) {
      return NextResponse.json(
        { error: 'Vendor ID is required' },
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

    const handle = await tasks.trigger<typeof generateVendorMitigation>(
      'generate-vendor-mitigation',
      {
        organizationId,
        vendorId,
        authorId: author.id,
        policies,
      },
    );

    // See risks/regenerate-mitigation: don't fail the request when only the
    // token mint fails, since the run is already in flight. (Cubic #29.)
    let publicAccessToken: string | null = null;
    try {
      publicAccessToken = await triggerAuth.createPublicToken({
        scopes: { read: { runs: [handle.id] } },
        expirationTime: '15m',
      });
    } catch (mintErr) {
      console.error(
        '[regenerate-mitigation] vendor run triggered but token mint failed; client must resume via /active',
        { runId: handle.id, mintErr },
      );
    }

    return NextResponse.json({ runId: handle.id, publicAccessToken });
  } catch (error) {
    console.error('Error regenerating vendor mitigation:', error);
    return NextResponse.json({ error: 'Failed to regenerate mitigation' }, { status: 500 });
  }
}
