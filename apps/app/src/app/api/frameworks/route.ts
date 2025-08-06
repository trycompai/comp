import { db } from '@db';
import { getGT } from 'gt-next/server';
import { NextResponse } from 'next/server';

export async function GET() {
  const t = await getGT();

  try {
    const frameworks = await db.frameworkEditorFramework.findMany({
      select: {
        id: true,
        name: true,
        description: true,
        version: true,
        visible: true,
      },
    });

    return NextResponse.json({ frameworks });
  } catch (error) {
    console.error('Error fetching frameworks:', error);
    return NextResponse.json({ error: t('Failed to fetch frameworks') }, { status: 500 });
  }
}
