import { isAuthorized } from "@/app/lib/utils";
import { db } from "@comp/db";
import { redirect } from "next/navigation";
import { TasksClientPage } from "./TasksClientPage";

export default async function Page() {
  const isAllowed = await isAuthorized();

  if (!isAllowed) {
    redirect("/auth");
  }

  const tasks = await db.frameworkEditorTaskTemplate.findMany({
    // Optionally include related data if needed
    include: {
      controlTemplates: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });

  return <TasksClientPage initialTasks={tasks} />;
}
