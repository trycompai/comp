import { db } from '@db';
import { verifyUnsubscribeToken } from '@/lib/unsubscribe';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, token } = body;

    if (!email || !token) {
      return NextResponse.json({ error: 'Email and token are required' }, { status: 400 });
    }

    if (!verifyUnsubscribeToken(email, token)) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 400 });
    }

    const user = await db.user.findUnique({
      where: { email },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    await db.user.update({
      where: { email },
      data: { emailNotificationsUnsubscribed: true },
    });

    return NextResponse.json({ success: true, message: 'Successfully unsubscribed from email notifications' });
  } catch (error) {
    console.error('Error unsubscribing user:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const email = searchParams.get('email');
    const token = searchParams.get('token');

    if (!email || !token) {
      return NextResponse.json({ error: 'Email and token are required' }, { status: 400 });
    }

    if (!verifyUnsubscribeToken(email, token)) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 400 });
    }

    const user = await db.user.findUnique({
      where: { email },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    await db.user.update({
      where: { email },
      data: { emailNotificationsUnsubscribed: true },
    });

    return NextResponse.redirect(new URL(`/unsubscribe?success=true&email=${encodeURIComponent(email)}`, req.url));
  } catch (error) {
    console.error('Error unsubscribing user:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

