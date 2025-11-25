import { db } from '@db';
import { verifyUnsubscribeToken } from '@/lib/unsubscribe';
import { NextRequest, NextResponse } from 'next/server';

const DEFAULT_PREFERENCES = {
  policyNotifications: true,
  taskReminders: true,
  weeklyTaskDigest: true,
  unassignedItemsNotifications: true,
};

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
      select: { emailPreferences: true, emailNotificationsUnsubscribed: true },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // If user has the old all-or-nothing unsubscribe flag, convert to preferences
    if (user.emailNotificationsUnsubscribed) {
      const allUnsubscribed = {
        policyNotifications: false,
        taskReminders: false,
        weeklyTaskDigest: false,
        unassignedItemsNotifications: false,
      };
      return NextResponse.json({ preferences: allUnsubscribed });
    }

    // Return preferences or defaults
    const preferences =
      user.emailPreferences && typeof user.emailPreferences === 'object'
        ? { ...DEFAULT_PREFERENCES, ...(user.emailPreferences as Record<string, boolean>) }
        : DEFAULT_PREFERENCES;

    return NextResponse.json({ preferences });
  } catch (error) {
    console.error('Error fetching preferences:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, token, preferences } = body;

    if (!email || !token) {
      return NextResponse.json({ error: 'Email and token are required' }, { status: 400 });
    }

    if (!preferences || typeof preferences !== 'object') {
      return NextResponse.json({ error: 'Preferences are required' }, { status: 400 });
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

    // Validate preferences structure
    const validPreferences = {
      policyNotifications: Boolean(preferences.policyNotifications ?? true),
      taskReminders: Boolean(preferences.taskReminders ?? true),
      weeklyTaskDigest: Boolean(preferences.weeklyTaskDigest ?? true),
      unassignedItemsNotifications: Boolean(preferences.unassignedItemsNotifications ?? true),
    };

    // Update both emailPreferences and the legacy flag
    const allUnsubscribed = Object.values(validPreferences).every((v) => v === false);

    await db.user.update({
      where: { email },
      data: {
        emailPreferences: validPreferences,
        emailNotificationsUnsubscribed: allUnsubscribed,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Preferences saved successfully',
      preferences: validPreferences,
    });
  } catch (error) {
    console.error('Error saving preferences:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

