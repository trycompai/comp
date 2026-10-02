import { researchVendor } from '@/trigger/tasks/scrape/research';
import { auth } from '@/utils/auth';
import { tasks } from '@trigger.dev/sdk';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: req.headers,
    });

    if (!session?.session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const website = body?.website;

    if (!website || typeof website !== 'string') {
      return NextResponse.json(
        { error: 'A valid website URL is required' },
        { status: 400 },
      );
    }

    // research-vendor writes to the shared GlobalVendors table rather than
    // per-org data, and this route is reachable before an org exists (e.g.
    // during onboarding), so an active organization isn't guaranteed here.
    // Tag the run when one is available so it can still be looked up
    // through the org-scoped status route.
    const organizationId = session.session.activeOrganizationId;

    const handle = await tasks.trigger<typeof researchVendor>(
      'research-vendor',
      { website },
      organizationId ? { tags: [organizationId] } : undefined,
    );

    return NextResponse.json({ success: true, handle });
  } catch (error) {
    console.error('Error in research vendor:', error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Failed to trigger vendor research',
      },
      { status: 500 },
    );
  }
}
