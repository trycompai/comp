import { auth } from "@/auth";
import { TaskAttachments } from "@/components/risks/tasks/task-attachment";
import { TaskComment } from "@/components/risks/tasks/task-comments";
import { TaskOverview } from "@/components/risks/tasks/task-overview";

import { env } from "@/env.mjs";
import { getI18n } from "@/locales/server";
import { db } from "@bubba/db";
import type { Metadata } from "next";
import { setStaticParamsLocale } from "next-international/server";
import { unstable_cache } from "next/cache";
import { redirect } from "next/navigation";

interface PageProps {
  params: Promise<{ riskId: string; taskId: string }>;
}

export default async function RiskPage({ params }: PageProps) {
  const session = await auth();
  const { riskId, taskId } = await params;

  if (!session) {
    redirect("/login");
  }

  if (!session.user.organizationId || !riskId) {
    redirect("/");
  }

  const task = await getTask(riskId, taskId);

  if (!task) {
    redirect("/risk");
  }

  const users = await getUsers(session.user.organizationId);
  const signedUrls = await getFiles(taskId);

  return (
    <div className="flex flex-col gap-4">
      <TaskOverview task={task} users={users} />
      <TaskAttachments task={task} users={users} signedUrls={signedUrls} />
      <TaskComment task={task} users={users} />
    </div>
  );
}

const getFiles = unstable_cache(
  async (taskId: string) => {
    const files = await db.taskAttachment.findMany({
      where: {
        riskMitigationTaskId: taskId,
      },
    });

    const signedUrls = await Promise.all(
      files.map(async (file) => {
        const response = await fetch(
          "https://api.uploadthing.com/v6/requestFileAccess",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "X-Uploadthing-Api-Key": env.UPLOADTHING_SECRET,
            },
            body: JSON.stringify({
              fileKey: file.fileKey,
              customId: null,
              expiresIn: 3600,
            }),
          },
        );

        const data = await response.json();

        return {
          signedUrl: data.url,
        };
      }),
    );

    return signedUrls;
  },
  ["files-cache"],
);

const getTask = unstable_cache(
  async (riskId: string, taskId: string) => {
    const task = await db.riskMitigationTask.findUnique({
      where: {
        riskId: riskId,
        id: taskId,
      },
      include: {
        owner: true,
        TaskAttachment: true,
        TaskComments: true,
      },
    });

    return task;
  },
  ["risk-cache"],
);

const getUsers = unstable_cache(
  async (organizationId: string) => {
    const users = await db.user.findMany({
      where: { organizationId: organizationId },
    });

    return users;
  },
  ["users-cache"],
);

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  setStaticParamsLocale(locale);
  const t = await getI18n();

  return {
    title: t("sub_pages.risk.tasks.task_overview"),
  };
}
