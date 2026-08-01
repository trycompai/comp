import { auth as betterAuth } from '@/utils/auth';
import { auth, runs } from '@trigger.dev/sdk';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ runId: string }> },
) {
  try {
    const { runId } = await params;

    if (!runId) {
      return NextResponse.json({ error: 'Run ID is required' }, { status: 400 });
    }

    const accessToken = req.nextUrl.searchParams.get('accessToken');

    if (!accessToken) {
      const session = await betterAuth.api.getSession({
        headers: req.headers,
      });
      if (!session?.session) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
    } else {
      const scopes = await auth.getPayloadFromJWT(accessToken);
      if (!scopes) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
    }

    const run = await runs.retrieve(runId);

    if (!run) {
      return NextResponse.json({ error: 'Run not found' }, { status: 404 });
    }

    return NextResponse.json(run);
  } catch (error) {
    console.error('Error retrieving trigger run:', error);

    if (error instanceof Error) {
      if (error.message.includes('not found') || error.message.includes('404')) {
        return NextResponse.json({ error: 'Run not found' }, { status: 404 });
      }
    }

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Failed to retrieve run status',
      },
      { status: 500 },
    );
  }
}
