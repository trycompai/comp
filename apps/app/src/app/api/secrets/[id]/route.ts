import { decrypt, encrypt, type EncryptedData } from '@/lib/encryption';
import { auth } from '@/utils/auth';
import { db } from '@db';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const updateSecretSchema = z.object({
  name: z
    .string()
    .min(1)
    .max(100)
    .regex(/^[A-Z0-9_]+$/, 'Name must be uppercase letters, numbers, and underscores only')
    .optional(),
  value: z.string().min(1).optional(),
  description: z.string().nullable().optional(),
  category: z.string().nullable().optional(),
  organizationId: z.string().min(1),
});

// GET /api/secrets/[id] - Get a specific secret (value is decrypted)
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const organizationId: string | null = request.nextUrl.searchParams.get('organizationId');

  if (!organizationId) {
    return NextResponse.json({ error: 'Organization ID is required' }, { status: 400 });
  }

  try {
    const { id } = await params;
    const session = await auth.api.getSession({
      headers: request.headers,
    });
    if (!session?.user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const secret = await db.secret.findFirst({
      where: {
        id,
        organizationId,
      },
    });

    if (!secret) {
      return NextResponse.json({ error: 'Secret not found' }, { status: 404 });
    }

    // Decrypt the value before returning
    const decryptedValue = await decrypt(JSON.parse(secret.value) as EncryptedData);

    return NextResponse.json({
      secret: {
        ...secret,
        value: decryptedValue,
      },
    });
  } catch (error) {
    console.error('Error fetching secret:', error);
    return NextResponse.json({ error: 'Failed to fetch secret' }, { status: 500 });
  }
}

// PUT /api/secrets/[id] - Update a secret
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const session = await auth.api.getSession({
      headers: request.headers,
    });
    if (!session?.user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = updateSecretSchema.parse(body);

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

    // Verify the secret belongs to this organization
    const existingSecret = await db.secret.findFirst({
      where: {
        id,
        organizationId: validatedData.organizationId,
      },
    });

    if (!existingSecret) {
      return NextResponse.json({ error: 'Secret not found' }, { status: 404 });
    }

    // If name is being changed, check for duplicates
    if (validatedData.name && validatedData.name !== existingSecret.name) {
      const duplicateSecret = await db.secret.findUnique({
        where: {
          organizationId_name: {
            organizationId: validatedData.organizationId,
            name: validatedData.name,
          },
        },
      });

      if (duplicateSecret) {
        return NextResponse.json(
          { error: `Secret with name ${validatedData.name} already exists` },
          { status: 400 },
        );
      }
    }

    // Prepare update data
    const updateData: any = {};
    if (validatedData.name !== undefined) updateData.name = validatedData.name;
    if (validatedData.value !== undefined) {
      const encryptedValue = await encrypt(validatedData.value);
      updateData.value = JSON.stringify(encryptedValue);
    }
    if (validatedData.description !== undefined) updateData.description = validatedData.description;
    if (validatedData.category !== undefined) updateData.category = validatedData.category;

    // Update the secret
    const updatedSecret = await db.secret.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        name: true,
        description: true,
        category: true,
        updatedAt: true,
      },
    });

    return NextResponse.json({ secret: updatedSecret });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid input', details: error.issues }, { status: 400 });
    }
    console.error('Error updating secret:', error);
    return NextResponse.json({ error: 'Failed to update secret' }, { status: 500 });
  }
}

// DELETE /api/secrets/[id] - Delete a secret
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const organizationId: string | null = request.nextUrl.searchParams.get('organizationId');

  if (!organizationId) {
    return NextResponse.json({ error: 'Organization ID is required' }, { status: 400 });
  }

  try {
    const { id } = await params;
    const session = await auth.api.getSession({
      headers: request.headers,
    });
    if (!session?.user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin
    const member = await db.member.findFirst({
      where: {
        organizationId,
        userId: session.user.id,
        deactivated: false,
      },
    });

    if (!member || (!member.role.includes('admin') && !member.role.includes('owner'))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Verify the secret belongs to this organization
    const existingSecret = await db.secret.findFirst({
      where: {
        id,
        organizationId,
      },
    });

    if (!existingSecret) {
      return NextResponse.json({ error: 'Secret not found' }, { status: 404 });
    }

    // Delete the secret
    await db.secret.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      deletedSecretName: existingSecret.name,
    });
  } catch (error) {
    console.error('Error deleting secret:', error);
    return NextResponse.json({ error: 'Failed to delete secret' }, { status: 500 });
  }
}
