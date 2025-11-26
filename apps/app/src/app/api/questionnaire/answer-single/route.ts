import { auth } from '@/utils/auth';
import { answerQuestion } from '@/jobs/tasks/vendors/answer-question';
import { logger } from '@/utils/logger';
import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

const inputSchema = z.object({
  question: z.string(),
  questionIndex: z.number(),
  totalQuestions: z.number(),
});

export async function POST(req: NextRequest) {
  const sessionResponse = await auth.api.getSession({
    headers: await headers(),
  });

  if (!sessionResponse?.session?.activeOrganizationId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const organizationId = sessionResponse.session.activeOrganizationId;

  try {
    const body = await req.json();
    const parsedInput = inputSchema.parse(body);
    const { question, questionIndex, totalQuestions } = parsedInput;

    // Call answerQuestion function directly
    const result = await answerQuestion(
      {
        question,
        organizationId,
        questionIndex,
        totalQuestions,
      },
      {
        useMetadata: false,
      },
    );

    // Revalidate the page to show updated answer
    const headersList = await headers();
    let path = headersList.get('x-pathname') || headersList.get('referer') || '';
    path = path.replace(/\/[a-z]{2}\//, '/');
    revalidatePath(path);

    return NextResponse.json({
      success: result.success,
      data: {
        questionIndex: result.questionIndex,
        question: result.question,
        answer: result.answer,
        sources: result.sources,
        error: result.error,
      },
    });
  } catch (error) {
    logger.error('Failed to answer single question', {
      organizationId,
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Invalid input', details: error.errors },
        { status: 400 },
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to answer question',
      },
      { status: 500 },
    );
  }
}

