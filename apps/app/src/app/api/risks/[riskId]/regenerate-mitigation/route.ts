import { generateRiskMitigation } from '@/trigger/tasks/onboarding/generate-risk-mitigation';
import {
  findCommentAuthor,
  type PolicyContext,
} from '@/trigger/tasks/onboarding/onboard-organization-helpers';
import { auth } from '@/utils/auth';
import { db } from '@db';
import { tasks } from '@trigger.dev/sdk';
import { NextRequest, NextResponse } from 'next/server';

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

    const [author, policyRows] = await Promise.all([
      findCommentAuthor(organizationId),
      db.policy.findMany({
        where: { organizationId },
        select: { name: true, description: true },
      }),
    ]);

    if (!author) {
      return NextResponse.json(
        { error: 'No eligible author found to regenerate the mitigation' },
        { status: 400 },
      );
    }

    const policies: PolicyContext[] = policyRows.map((policy) => ({
      name: policy.name,
      description: policy.description,
    }));

    await tasks.trigger<typeof generateRiskMitigation>(
      'generate-risk-mitigation',
      {
        organizationId,
        riskId,
        authorId: author.id,
        policies,
      },
    );

    return NextResponse.json({ success: true });
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
