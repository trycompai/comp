'use server';

import PageWithBreadcrumb from '@/components/pages/PageWithBreadcrumb';
import { auth } from '@/utils/auth';
import { AttachmentEntityType, CommentEntityType, db } from '@db';
import { getGT } from 'gt-next/server';
import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { cache } from 'react';
import { Comments, CommentWithAuthor } from '../../../../../components/comments/Comments';
import { VendorInherentRiskChart } from './components/VendorInherentRiskChart';
import { VendorResidualRiskChart } from './components/VendorResidualRiskChart';
import { SecondaryFields } from './components/secondary-fields/secondary-fields';

interface PageProps {
  params: Promise<{ vendorId: string; locale: string; orgId: string }>;
}

export default async function VendorPage({ params }: PageProps) {
  const { vendorId, orgId } = await params;
  const vendor = await getVendor(vendorId);
  const assignees = await getAssignees();
  const comments = await getComments(vendorId);

  if (!vendor || !vendor.vendor) {
    redirect('/');
  }

  return (
    <PageWithBreadcrumb
      breadcrumbs={[
        { label: 'Vendors', href: `/${orgId}/vendors` },
        { label: vendor.vendor?.name ?? '', current: true },
      ]}
    >
      <div className="flex flex-col gap-4">
        <SecondaryFields
          vendor={vendor.vendor}
          assignees={assignees}
          globalVendor={vendor.globalVendor}
        />
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <VendorInherentRiskChart vendor={vendor.vendor} />
          <VendorResidualRiskChart vendor={vendor.vendor} />
        </div>
        <Comments entityId={vendorId} comments={comments} entityType={CommentEntityType.vendor} />
      </div>
    </PageWithBreadcrumb>
  );
}

const getVendor = cache(async (vendorId: string) => {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session || !session.session.activeOrganizationId) {
    return null;
  }

  const vendor = await db.vendor.findUnique({
    where: {
      id: vendorId,
      organizationId: session.session.activeOrganizationId,
    },
    include: {
      assignee: {
        include: {
          user: true,
        },
      },
    },
  });

  if (vendor?.website) {
    const globalVendor = await db.globalVendors.findFirst({
      where: {
        website: vendor.website,
      },
    });

    return {
      vendor: vendor,
      globalVendor,
    };
  }

  return {
    vendor: vendor,
    globalVendor: null,
  };
});

const getComments = async (vendorId: string): Promise<CommentWithAuthor[]> => {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  const activeOrgId = session?.session.activeOrganizationId;

  if (!activeOrgId) {
    console.warn('Could not determine active organization ID in getComments');
    return [];
  }

  const comments = await db.comment.findMany({
    where: {
      organizationId: activeOrgId,
      entityId: vendorId,
      entityType: CommentEntityType.vendor,
    },
    include: {
      author: {
        include: {
          user: true,
        },
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  const commentsWithAttachments = await Promise.all(
    comments.map(async (comment) => {
      const attachments = await db.attachment.findMany({
        where: {
          organizationId: activeOrgId,
          entityId: comment.id,
          entityType: AttachmentEntityType.comment,
        },
      });
      return {
        id: comment.id,
        content: comment.content,
        author: {
          id: comment.author.user.id,
          name: comment.author.user.name,
          email: comment.author.user.email,
        },
        attachments: attachments.map((att) => ({
          id: att.id,
          name: att.name,
          type: att.type,
          downloadUrl: att.url || '', // assuming url maps to downloadUrl
          createdAt: att.createdAt.toISOString(),
        })),
        createdAt: comment.createdAt.toISOString(),
      };
    }),
  );

  return commentsWithAttachments;
};

const getAssignees = cache(async () => {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session || !session.session.activeOrganizationId) {
    return [];
  }

  const assignees = await db.member.findMany({
    where: {
      organizationId: session.session.activeOrganizationId,
      role: {
        notIn: ['employee'],
      },
    },
    include: {
      user: true,
    },
  });

  return assignees;
});

export async function generateMetadata(): Promise<Metadata> {
  const t = await getGT();
  return {
    title: t('Vendors'),
  };
}
