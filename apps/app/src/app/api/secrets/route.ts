'use server';

import { encrypt } from '@/lib/encryption';
import { auth } from '@/utils/auth';
import { db } from '@db';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const createSecretSchema = z.object({
  name: z
    .string()
    .min(1)
    .max(100)
    .regex(/^[A-Z0-9_]+$/, 'Name must be uppercase letters, numbers, and underscores only'),
  value: z.string().min(1),
  // Optional in UI; accept undefined or null
  description: z.string().nullish(),
  category: z.string().nullish(),
  organizationId: z.string().min(1),
});

// GET /api/secrets - List all secrets for the organization
export async function GET(request: NextRequest) {
  const organizationId: string | null = request.nextUrl.searchParams.get('organizationId');

  if (!organizationId) {
    return NextResponse.json({ error: 'Organization ID is required' }, { status: 400 });
  }

  try {
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session?.user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const secrets = await db.secret.findMany({
      where: {
        organizationId,
      },
      select: {
        id: true,
        name: true,
        description: true,
        category: true,
        lastUsedAt: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: {
        name: 'asc',
      },
    });

    return NextResponse.json({ secrets });
  } catch (error) {
    console.error('Error fetching secrets:', error);
    return NextResponse.json({ error: 'Failed to fetch secrets' }, { status: 500 });
  }
}

// POST /api/secrets - Create a new secret
export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session?.user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = createSecretSchema.parse(body);

    // Check if user is admin
    const member = await db.member.findFirst({
      where: {
        organizationId: validatedData.organizationId,
        userId: session.user.id,
        deactivated: false,
      },
    });

    if (!member || (!member.role.includes('admin') && !member.role.includes('owner'))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Check if secret with this name already exists
    const existingSecret = await db.secret.findUnique({
      where: {
        organizationId_name: {
          organizationId: validatedData.organizationId,
          name: validatedData.name,
        },
      },
    });

    if (existingSecret) {
      return NextResponse.json(
        { error: `Secret with name ${validatedData.name} already exists` },
        { status: 400 },
      );
    }

    // Encrypt the value
    const encryptedValue = await encrypt(validatedData.value);

    // Create the secret
    const secret = await db.secret.create({
      data: {
        organizationId: validatedData.organizationId,
        name: validatedData.name,
        value: JSON.stringify(encryptedValue), // Serialize EncryptedData to string
        description: validatedData.description,
        category: validatedData.category,
      },
      select: {
        id: true,
        name: true,
        description: true,
        category: true,
        createdAt: true,
      },
    });

    return NextResponse.json({ secret }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('Invalid input:', error.issues);
      return NextResponse.json({ error: 'Invalid input', details: error.issues }, { status: 400 });
    }
    console.error('Error creating secret:', error);
    return NextResponse.json({ error: 'Failed to create secret' }, { status: 500 });
  }
}
