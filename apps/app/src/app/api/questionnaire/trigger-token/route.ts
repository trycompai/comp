import { auth as betterAuth } from '@/utils/auth';
import { auth } from '@trigger.dev/sdk';
import { NextRequest, NextResponse } from 'next/server';

const ALLOWED_TASK_IDS = [
  'parse-questionnaire',
  'vendor-questionnaire-orchestrator',
  'answer-question',
] as const;

export async function POST(req: NextRequest) {
  try {
    const session = await betterAuth.api.getSession({
      headers: req.headers,
    });

    if (!session?.session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const taskId = body?.taskId;

    if (!taskId || !ALLOWED_TASK_IDS.includes(taskId)) {
      return NextResponse.json(
        { error: 'Invalid taskId' },
        { status: 400 },
      );
    }

    const token = await auth.createTriggerPublicToken(taskId, {
      multipleUse: true,
      expirationTime: '1hr',
    });

    return NextResponse.json({ success: true, token });
  } catch (error) {
    console.error('Error creating trigger token:', error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Failed to create trigger token',
      },
      { status: 500 },
    );
  }
}
