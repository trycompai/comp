import { db } from '@db';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ automationId: string }> }
) {
  try {
    const { automationId } = await params;

    const runs = await db.evidenceAutomationRun.findMany({
      where: {
        evidenceAutomationId: automationId,
      },
      include: {
        evidenceAutomation: {
          select: {
            name: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 50,
    });

    return NextResponse.json({ success: true, runs });
  } catch (error) {
    console.error('Failed to fetch automation runs:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch runs' },
      { status: 500 }
    );
  }
}



