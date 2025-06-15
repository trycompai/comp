import { cache } from "react";
import PageWithBreadcrumb from "@/components/pages/PageWithBreadcrumb";
import { auth } from "@/utils/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { FrameworksOverview } from "./components/FrameworksOverview";
import { getAllFrameworkInstancesWithControls } from "./data/getAllFrameworkInstancesWithControls";
import { db } from "@comp/db";

export async function generateMetadata() {
  return {
    title: "Frameworks",
  };
}

export default async function DashboardPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  const organizationId = session?.session.activeOrganizationId;

  if (!organizationId) {
    redirect("/");
  }

  const tasks = await getControlTasks();
  const frameworksWithControls = await getAllFrameworkInstancesWithControls({
    organizationId,
  });

  const allFrameworks = await db.frameworkEditorFramework.findMany({
    where: {
      visible: true,
    },
  });

  return (
    <PageWithBreadcrumb breadcrumbs={[{ label: "Frameworks", current: true }]}>
      <FrameworksOverview
        frameworksWithControls={frameworksWithControls}
        tasks={tasks}
        allFrameworks={allFrameworks}
      />
    </PageWithBreadcrumb>
  );
}

const getControlTasks = cache(async () => {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  const organizationId = session?.session.activeOrganizationId;

  if (!organizationId) {
    return [];
  }

  const tasks = await db.task.findMany({
    where: {
      organizationId,
      controls: {
        some: {
          organizationId,
        },
      },
    },
    include: {
      controls: true,
    },
  });

  return tasks;
});
