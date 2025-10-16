import { env } from '@/env.mjs';
import { trainingVideos } from '@/lib/data/training-videos';
import { InvitePortalEmail, sendEmail } from '@comp/email';
import { db, type Departments, type Member, type Role } from '@db';
import { revalidatePath } from 'next/cache';

if (!env.NEXT_PUBLIC_PORTAL_URL) {
  throw new Error('NEXT_PUBLIC_PORTAL_URL is not set');
}

/**
 * Complete employee creation by handling all steps:
 * 1. Create/reactivate the employee
 * 2. Create/update portal user
 * 3. Create training video entries
 */
export async function completeEmployeeCreation(params: {
  name: string;
  email: string;
  department: Departments;
  organizationId: string;
  externalEmployeeId?: string;
}): Promise<Member | undefined> {
  const { name, email, department, organizationId } = params;
  console.log(`Starting employee creation for ${email}`);

  // Check if the user already exists
  const existingUser = await db.user.findFirst({
    where: {
      email: {
        equals: email,
        mode: 'insensitive',
      },
    },
  });

  let employee: Member;
  let userId: string;

  if (existingUser) {
    // Handle existing user flow
    employee = await handleExistingUser({
      userId: existingUser.id,
      organizationId,
      department,
    });
    userId = existingUser.id;
  } else {
    // Handle new user flow
    employee = await createNewUser({
      name,
      email,
      organizationId,
      department,
    });
    userId = employee.userId;
  }

  // Get organization details for email
  //   const organization = await db.organization.findUnique({
  //     where: { id: organizationId },
  //   });

  // Send portal invitation
  // await inviteEmployeeToPortal({
  // 	email,
  // 	organizationName: organization?.name || "an organization",
  // 	inviteLink: process.env.NEXT_PUBLIC_PORTAL_URL || "",
  // });

  // Create training video entries for the employee
  await createTrainingVideoEntries(employee.id);

  // Revalidate relevant paths to update UI
  revalidatePath(`/${organizationId}/people`);

  return employee;
}

/**
 * Sends an invitation email to an employee for portal access
 */
async function inviteEmployeeToPortal({
  email,
  organizationName,
  inviteLink,
}: {
  email: string;
  organizationName: string;
  inviteLink: string;
}) {
  console.log(`Sending portal invite to ${email} for ${organizationName}`);

  await sendEmail({
    to: email,
    subject: `You've been invited to join ${organizationName || 'an organization'} on Comp AI`,
    react: InvitePortalEmail({
      email,
      organizationName,
      inviteLink,
    }),
  });

  return { success: true };
}

/**
 * Creates training video tracking entries for a new member
 * This function is exported so it can be used in other invitation flows
 */
export async function createTrainingVideoEntries(memberId: string) {
  console.log(`Creating training video entries for member ${memberId}`);

  // Create an entry for each video in the system
  const result = await db.employeeTrainingVideoCompletion.createMany({
    data: trainingVideos.map((video) => ({
      memberId: memberId,
      videoId: video.id,
    })),
    skipDuplicates: true,
  });

  console.log(`Created ${result.count} training video entries for member ${memberId}`);

  return result;
}

/**
 * Handle the flow for an existing user
 */
async function handleExistingUser({
  userId,
  organizationId,
  department,
}: {
  userId: string;
  organizationId: string;
  department: Departments;
}): Promise<Member> {
  // Check if user is already a member of the organization
  const existingMember = await db.member.findFirst({
    where: {
      userId,
      organizationId,
    },
  });

  if (!existingMember) {
    // Create a new member record if they're not already in the organization
    console.log(`[EXISTING_USER] Creating new member for existing user ${userId}`);
    const newMember = await db.member.create({
      data: {
        userId,
        organizationId,
        role: 'employee',
        department,
        isActive: true,
      },
    });
    console.log(`[EXISTING_USER] Created new member with ID: ${newMember.id}`);
    return newMember;
  }

  // User is already a member, check if they have any role
  const existingMemberRoles = existingMember.role.split(',') as (
    | 'admin'
    | 'auditor'
    | 'employee'
    | 'owner'
  )[];

  console.log(`[EXISTING_USER] Current roles for user: ${existingMemberRoles.join(', ')}`);

  // If they already have any role, we can't add them as an employee
  if (existingMemberRoles.length > 0) {
    console.log(
      `[EXISTING_USER] User already has role(s): ${existingMemberRoles.join(', ')}. Cannot add as employee.`,
    );
    throw new Error(
      `User already has role(s): ${existingMemberRoles.join(', ')}. Each person can only have one role.`,
    );
  }

  // If they have no role (this shouldn't happen but just in case), assign employee role
  console.log(`[EXISTING_USER] Adding employee role to member ${existingMember.id}`);

  // Instead of using auth.api, update the member record directly
  try {
    const updatedMember = await db.member.update({
      where: {
        id: existingMember.id,
      },
      data: {
        role: 'employee' as Role,
        department,
        isActive: true,
      },
    });

    if (!updatedMember) {
      console.error('[EXISTING_USER] Failed to update member role - no member returned');
      throw new Error('Failed to update member role');
    }

    console.log(`[EXISTING_USER] Successfully updated member role to: ${updatedMember.role}`);
    return updatedMember;
  } catch (dbError) {
    console.error('[EXISTING_USER] Database error when updating member role:', dbError);
    throw new Error(
      `Failed to update member role: ${dbError instanceof Error ? dbError.message : String(dbError)}`,
    );
  }
}

/**
 * Create a new user and add them as a member
 */
async function createNewUser({
  name,
  email,
  organizationId,
  department,
}: {
  name: string;
  email: string;
  organizationId: string;
  department: Departments;
}): Promise<Member> {
  // Create a skeleton user
  const user = await db.user.create({
    data: {
      name,
      email,
      emailVerified: false,
    },
  });

  // Add them as a member to the organization with the employee role
  const newMember = await db.member.create({
    data: {
      userId: user.id,
      organizationId,
      role: 'employee',
      department,
      isActive: true,
    },
  });

  if (!newMember) {
    throw new Error('Failed to add employee to organization');
  }

  return newMember;
}
