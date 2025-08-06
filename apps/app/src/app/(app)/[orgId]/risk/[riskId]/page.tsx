import PageWithBreadcrumb from '@/components/pages/PageWithBreadcrumb';
import { InherentRiskChart } from '@/components/risks/charts/InherentRiskChart';
import { ResidualRiskChart } from '@/components/risks/charts/ResidualRiskChart';
import { RiskOverview } from '@/components/risks/risk-overview';
import { auth } from '@/utils/auth';
import { AttachmentEntityType, CommentEntityType, db } from '@db';
import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { cache } from 'react';
import { getGT } from 'gt-next/server';
import { Comments, CommentWithAuthor } from '../../../../../components/comments/Comments';

interface PageProps {
  searchParams: Promise<{
    search?: string;
    status?: string;
    sort?: string;
    page?: string;
    per_page?: string;
  }>;
  params: Promise<{ riskId: string; orgId: string }>;
}

export default async function RiskPage({ searchParams, params }: PageProps) {
  const { riskId, orgId } = await params;
  const t = await getGT();
  const risk = await getRisk(riskId);
  const comments = await getComments(riskId);
  const assignees = await getAssignees();
  if (!risk) {
    redirect('/');
  }

  return (
    <PageWithBreadcrumb
      breadcrumbs={[
        { label: t('Risks'), href: `/${orgId}/risk` },
        { label: risk.title, current: true },
      ]}
    >
      <div className="flex flex-col gap-4">
        <RiskOverview risk={risk} assignees={assignees} />
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <InherentRiskChart risk={risk} />
          <ResidualRiskChart risk={risk} />
        </div>
        <Comments entityId={riskId} entityType={CommentEntityType.risk} comments={comments} />
      </div>
    </PageWithBreadcrumb>
  );
}

const getRisk = cache(async (riskId: string) => {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session || !session.session.activeOrganizationId) {
    return null;
  }

  const risk = await db.risk.findUnique({
    where: {
      id: riskId,
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

  return risk;
});

const getComments = async (riskId: string): Promise<CommentWithAuthor[]> => {
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
      entityId: riskId,
      entityType: CommentEntityType.risk,
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
    title: t('Risk Overview'),
  };
}
