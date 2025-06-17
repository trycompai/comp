import { env } from '@/env.mjs';
import { revalidatePath } from 'next/cache';
import { type NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { path, type, secret } = await request.json();

    console.log('Revalidating path from API: ', path);

    if (secret !== env.REVALIDATION_SECRET) {
      return NextResponse.json({ message: 'Invalid secret' }, { status: 401 });
    }

    if (!path) {
      return NextResponse.json({ message: 'Path is required' }, { status: 400 });
    }

    revalidatePath(path, type);

    return NextResponse.json({ revalidated: true });
  } catch (err) {
    console.error('Error revalidating path:', err);
    return NextResponse.json({ message: 'Error revalidating path' }, { status: 500 });
  }
}
