import { APP_AWS_ORG_ASSETS_BUCKET, s3Client } from '@/app/s3';
import { DeleteOrganization } from '@/components/forms/organization/delete-organization';
import { TransferOwnership } from '@/components/forms/organization/transfer-ownership';
import { UpdateOrganizationAdvancedMode } from '@/components/forms/organization/update-organization-advanced-mode';
import { UpdateOrganizationLogo } from '@/components/forms/organization/update-organization-logo';
import { UpdateOrganizationName } from '@/components/forms/organization/update-organization-name';
import { UpdateOrganizationWebsite } from '@/components/forms/organization/update-organization-website';
import { auth } from '@/utils/auth';
import { GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { db, Role } from '@db';
import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { cache } from 'react';

export default async function OrganizationSettings() {
  const organization = await organizationDetails();
  const logoUrl = await getLogoUrl(organization?.logo);
  const { isOwner, eligibleMembers } = await getOwnershipData();

  return (
    <div className="space-y-4">
      <UpdateOrganizationName organizationName={organization?.name ?? ''} />
      <UpdateOrganizationWebsite organizationWebsite={organization?.website ?? ''} />
      <UpdateOrganizationLogo currentLogoUrl={logoUrl} />
      <UpdateOrganizationAdvancedMode
        advancedModeEnabled={organization?.advancedModeEnabled ?? false}
      />
      <TransferOwnership members={eligibleMembers} isOwner={isOwner} />
      <DeleteOrganization organizationId={organization?.id ?? ''} isOwner={isOwner} />
    </div>
  );
}

async function getLogoUrl(logoKey: string | null | undefined): Promise<string | null> {
  if (!logoKey || !s3Client || !APP_AWS_ORG_ASSETS_BUCKET) return null;

  try {
    const command = new GetObjectCommand({
      Bucket: APP_AWS_ORG_ASSETS_BUCKET,
      Key: logoKey,
    });
    return await getSignedUrl(s3Client, command, { expiresIn: 3600 });
  } catch {
    return null;
  }
}

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: 'Settings',
  };
}

const organizationDetails = cache(async () => {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.session.activeOrganizationId) {
    return null;
  }

  const organization = await db.organization.findUnique({
    where: { id: session?.session.activeOrganizationId },
    select: {
      name: true,
      id: true,
      website: true,
      advancedModeEnabled: true,
      logo: true,
    },
  });

  return organization;
});

const getOwnershipData = cache(async () => {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.session.activeOrganizationId || !session.user.id) {
    return { isOwner: false, eligibleMembers: [] };
  }

  const currentUserMember = await db.member.findFirst({
    where: {
      organizationId: session.session.activeOrganizationId,
      userId: session.user.id,
      deactivated: false,
    },
  });

  const currentUserRoles = currentUserMember?.role?.split(',').map((r) => r.trim()) ?? [];
  const isOwner = currentUserRoles.includes(Role.owner);

  console.log('[TransferOwnership Debug]', {
    userId: session.user.id,
    orgId: session.session.activeOrganizationId,
    rawRole: currentUserMember?.role,
    parsedRoles: currentUserRoles,
    isOwner,
  });

  // Only fetch eligible members if current user is owner
  let eligibleMembers: Array<{
    id: string;
    user: { name: string | null; email: string };
  }> = [];

  if (isOwner) {
    // First, let's check ALL members (including deactivated) for debugging
    const allMembers = await db.member.findMany({
      where: {
        organizationId: session.session.activeOrganizationId,
      },
      select: {
        id: true,
        userId: true,
        deactivated: true,
        role: true,
        user: {
          select: {
            name: true,
            email: true,
          },
        },
      },
    });

    console.log('[TransferOwnership Debug] ALL members in org:', {
      total: allMembers.length,
      members: allMembers.map((m) => ({
        id: m.id,
        email: m.user.email,
        role: m.role,
        deactivated: m.deactivated,
        isCurrentUser: m.userId === session.user.id,
      })),
    });

    // Now get only eligible members (active, not current user)
    const members = await db.member.findMany({
      where: {
        organizationId: session.session.activeOrganizationId,
        userId: { not: session.user.id }, // Exclude current user
        deactivated: false,
      },
      select: {
        id: true,
        user: {
          select: {
            name: true,
            email: true,
          },
        },
      },
      orderBy: {
        user: {
          email: 'asc',
        },
      },
    });

    eligibleMembers = members;
    
    console.log('[TransferOwnership Debug] Eligible members (active, not current user):', {
      count: members.length,
      members: members.map((m) => ({ id: m.id, email: m.user.email })),
    });
  }

  return { isOwner, eligibleMembers };
});
