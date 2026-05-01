import { linkRisksAndVendorsToWork } from '@/trigger/tasks/onboarding/link-risks-and-vendors-to-work';
import { auth } from '@/utils/auth';
import { tasks } from '@trigger.dev/sdk';
import { NextRequest, NextResponse } from 'next/server';

/**
 * POST /api/vendors/[vendorId]/auto-link
 *
 * Triggers the link-risks-and-vendors-to-work task scoped to a single vendor.
 *
 * Mirrors the fire-and-forget pattern used by regenerate-mitigation: we kick the
 * trigger task off and return immediately. The task itself returns a count of
 * linked tasks, but we cannot synchronously wait for that result from a Next.js
 * route (triggerAndWait only works inside another trigger task). Returning
 * `{ linked: 0 }` is intentional — the client revalidates SWR after this call,
 * so the user sees newly linked tasks via polling once the task completes.
 */
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

    await tasks.trigger<typeof linkRisksAndVendorsToWork>(
      'link-risks-and-vendors-to-work',
      {
        organizationId,
        vendorId,
      },
    );

    return NextResponse.json({ linked: 0 });
  } catch (error) {
    console.error('Error triggering vendor auto-link:', error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Failed to trigger auto-link',
      },
      { status: 500 },
    );
  }
}
