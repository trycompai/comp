import { db } from "@bubba/db";
import { auth } from "@/auth";
import { NextResponse, type NextRequest } from "next/server";
import { generateApiKey, hashApiKey } from "@/lib/api-key";

// GET: List API keys for the authenticated user's organization
export async function GET(request: NextRequest) {
  const session = await auth();

  // Check if the user is authenticated
  if (!session || !session.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Check if the user has an organization
  if (!session.user.organizationId) {
    return NextResponse.json(
      { error: "User is not associated with an organization" },
      { status: 400 }
    );
  }

  try {
    const apiKeys = await db.organizationApiKey.findMany({
      where: {
        organizationId: session.user.organizationId,
      },
      select: {
        id: true,
        name: true,
        createdAt: true,
        expiresAt: true,
        lastUsedAt: true,
        isActive: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json({ success: true, data: apiKeys });
  } catch (error) {
    console.error("Error fetching API keys:", error);
    return NextResponse.json(
      { error: "Failed to fetch API keys" },
      { status: 500 }
    );
  }
}

// POST: Create a new API key for the authenticated user's organization
export async function POST(request: NextRequest) {
  const session = await auth();

  // Check if the user is authenticated
  if (!session || !session.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Check if the user has an organization
  if (!session.user.organizationId) {
    return NextResponse.json(
      { error: "User is not associated with an organization" },
      { status: 400 }
    );
  }

  try {
    const body = await request.json();
    const { name, expiresAt } = body;

    // Validate the name
    if (!name || typeof name !== "string" || name.trim() === "") {
      return NextResponse.json(
        { error: "A valid name for the API key is required" },
        { status: 400 }
      );
    }

    // Generate a new API key
    const apiKey = generateApiKey();
    const hashedKey = hashApiKey(apiKey);

    // Create the API key in the database
    const apiKeyRecord = await db.organizationApiKey.create({
      data: {
        name: name.trim(),
        key: hashedKey,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
        organizationId: session.user.organizationId,
      },
      select: {
        id: true,
        name: true,
        createdAt: true,
        expiresAt: true,
      },
    });

    // Return the API key (this is the only time the plain text key will be available)
    return NextResponse.json({
      success: true,
      data: {
        ...apiKeyRecord,
        key: apiKey,
      },
    });
  } catch (error) {
    console.error("Error creating API key:", error);
    return NextResponse.json(
      { error: "Failed to create API key" },
      { status: 500 }
    );
  }
}

// DELETE: Revoke an API key
export async function DELETE(request: NextRequest) {
  const session = await auth();

  // Check if the user is authenticated
  if (!session || !session.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Check if the user has an organization
  if (!session.user.organizationId) {
    return NextResponse.json(
      { error: "User is not associated with an organization" },
      { status: 400 }
    );
  }

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "API key ID is required" },
        { status: 400 }
      );
    }

    // Update the API key to set isActive to false
    const apiKey = await db.organizationApiKey.updateMany({
      where: {
        id,
        organizationId: session.user.organizationId,
      },
      data: {
        isActive: false,
      },
    });

    if (apiKey.count === 0) {
      return NextResponse.json(
        { error: "API key not found or not authorized to revoke" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "API key revoked successfully",
    });
  } catch (error) {
    console.error("Error revoking API key:", error);
    return NextResponse.json(
      { error: "Failed to revoke API key" },
      { status: 500 }
    );
  }
}
