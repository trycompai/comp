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

export default async function OrganizationSettings({
  params,
}: {
  params: Promise<{ orgId: string }>;
}) {
  const { orgId } = await params;
  console.log('[OrganizationSettings Debug] orgId:', orgId);

  const organization = await organizationDetails(orgId);
  const logoUrl = await getLogoUrl(organization?.logo);
  const { isOwner, eligibleMembers } = await getOwnershipData(orgId);

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

async function organizationDetails(orgId: string) {
  const organization = await db.organization.findUnique({
    where: { id: orgId },
    select: {
      name: true,
      id: true,
      website: true,
      advancedModeEnabled: true,
      logo: true,
    },
  });

  return organization;
}

async function getOwnershipData(orgId: string) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user.id) {
    return { isOwner: false, eligibleMembers: [] };
  }

  const currentUserMember = await db.member.findFirst({
    where: {
      organizationId: orgId,
      userId: session.user.id,
      deactivated: false,
    },
  });

  const currentUserRoles = currentUserMember?.role?.split(',').map((r) => r.trim()) ?? [];
  const isOwner = currentUserRoles.includes(Role.owner);

  // Only fetch eligible members if current user is owner
  let eligibleMembers: Array<{
    id: string;
    user: { name: string | null; email: string };
  }> = [];

  if (isOwner) {
    // Get only eligible members (active, not current user)
    const members = await db.member.findMany({
      where: {
        organizationId: orgId,
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
  }

  return { isOwner, eligibleMembers };
}
