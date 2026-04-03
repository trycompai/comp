import { generateVendorMitigation } from '@/trigger/tasks/onboarding/generate-vendor-mitigation';
import type { PolicyContext } from '@/trigger/tasks/onboarding/onboard-organization-helpers';
import { serverApi } from '@/lib/api-server';
import { auth } from '@/utils/auth';
import { tasks } from '@trigger.dev/sdk';
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
    const session = await auth.api.getSession({
      headers: req.headers,
    });

    if (!session?.session?.activeOrganizationId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { vendorId } = await params;
    if (!vendorId) {
      return NextResponse.json(
        { error: 'Vendor ID is required' },
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

    await tasks.trigger<typeof generateVendorMitigation>(
      'generate-vendor-mitigation',
      {
        organizationId,
        vendorId,
        authorId: author.id,
        policies,
      },
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error regenerating vendor mitigation:', error);
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
