import { db } from "@db";
import { verifyUnsubscribeToken } from "@/lib/unsubscribe";
import { NextResponse } from "next/server";
import { z } from "zod";

const updatePreferencesSchema = z.object({
  email: z.string().email(),
  token: z.string(),
  preferences: z.object({
    policyNotifications: z.boolean(),
    taskReminders: z.boolean(),
    weeklyTaskDigest: z.boolean(),
    unassignedItemsNotifications: z.boolean(),
    taskMentions: z.boolean(),
    taskAssignments: z.boolean(),
  }),
});

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const parsed = updatePreferencesSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: "Invalid request body" },
        { status: 400 },
      );
    }

    const { email, token, preferences } = parsed.data;

    if (!verifyUnsubscribeToken(email, token)) {
      return NextResponse.json(
        { success: false, error: "Invalid token" },
        { status: 403 },
      );
    }

    const user = await db.user.findUnique({
      where: { email },
    });

    if (!user) {
      return NextResponse.json(
        { success: false, error: "User not found" },
        { status: 404 },
      );
    }

    const allUnsubscribed = Object.values(preferences).every(
      (v) => v === false,
    );

    await db.user.update({
      where: { email },
      data: {
        emailPreferences: preferences,
        emailNotificationsUnsubscribed: allUnsubscribed,
      },
    });

    return NextResponse.json({ success: true, data: preferences });
  } catch (error) {
    console.error("Error updating unsubscribe preferences:", error);
    return NextResponse.json(
      { success: false, error: "Failed to update preferences" },
      { status: 500 },
    );
  }
}
