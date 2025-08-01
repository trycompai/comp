import { auth } from '@/utils/auth';
import type { Attachment } from '@db';
import { AttachmentEntityType, CommentEntityType, db } from '@db';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { CommentWithAuthor } from '../../../../../components/comments/Comments';
import { SingleTask } from './components/SingleTask';

type Session = Awaited<ReturnType<typeof auth.api.getSession>>;

export default async function TaskPage({
  params,
}: {
  params: Promise<{ taskId: string; orgId: string; locale: string }>;
}) {
  console.log('[TaskPage] Starting page render');
  const { taskId, orgId } = await params;
  console.log('[TaskPage] Params extracted:', { taskId, orgId });
  console.log('[TaskPage] Getting session');
  const session = await auth.api.getSession({
    headers: headers(),
  });
  console.log('[TaskPage] Session obtained, fetching data');

  const [task, members, comments, attachments] = await Promise.all([
    getTask(taskId, session),
    getMembers(orgId, session),
    getComments(taskId, session),
    getAttachments(taskId, session),
  ]);

  if (!task) {
    redirect(`/${orgId}/tasks`);
  }

  return <SingleTask task={task} members={members} comments={comments} attachments={attachments} />;
}

const getTask = async (taskId: string, session: Session) => {
  console.log('[getTask] Starting task fetch for:', taskId);
  const activeOrgId = session?.session.activeOrganizationId;

  if (!activeOrgId) {
    console.warn('Could not determine active organization ID in getTask');
    return null;
  }

  console.log('[getTask] Querying database for task');
  try {
    const task = await db.task.findUnique({
      where: {
        id: taskId,
        organizationId: activeOrgId,
      },
    });

    console.log('[getTask] Database query successful');
    return task;
  } catch (error) {
    console.error('[getTask] Database query failed:', error);
    throw error;
  }
};

const getComments = async (taskId: string, session: Session): Promise<CommentWithAuthor[]> => {
  const activeOrgId = session?.session.activeOrganizationId;

  if (!activeOrgId) {
    console.warn('Could not determine active organization ID in getComments');
    return [];
  }

  const comments = await db.comment.findMany({
    where: {
      organizationId: activeOrgId,
      entityId: taskId,
      entityType: CommentEntityType.task,
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
        ...comment,
        attachments,
      };
    }),
  );

  return commentsWithAttachments;
};

const getAttachments = async (taskId: string, session: Session): Promise<Attachment[]> => {
  const activeOrgId = session?.session.activeOrganizationId;

  if (!activeOrgId) {
    console.warn('Could not determine active organization ID in getAttachments');
    return [];
  }
  const attachments = await db.attachment.findMany({
    where: {
      organizationId: activeOrgId,
      entityId: taskId,
      entityType: AttachmentEntityType.task,
    },
    orderBy: {
      createdAt: 'asc',
    },
  });
  return attachments;
};

const getMembers = async (orgId: string, session: Session) => {
  const activeOrgId = orgId ?? session?.session.activeOrganizationId;
  if (!activeOrgId) {
    console.warn('Could not determine active organization ID in getMembers');
    return [];
  }

  const members = await db.member.findMany({
    where: { organizationId: activeOrgId },
    include: { user: true },
  });
  return members;
};
