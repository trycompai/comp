import { db } from "@comp/db";
import { isAuthorized } from "@/app/lib/utils";
import { redirect } from "next/navigation";
import { ControlsClientPage } from "./ControlsClientPage";

export default async function Page() {
  const isAllowed = await isAuthorized();

  if (!isAllowed) {
    redirect("/auth");
  }

  const controls = await db.frameworkEditorControlTemplate.findMany({
    select: {
      id: true,
      name: true,
      description: true,
      createdAt: true,
      updatedAt: true,
      policyTemplates: {
        select: {
          id: true,
          name: true,
        },
      },
      requirements: {
        select: {
          id: true,
          name: true,
          framework: {
            select: {
              name: true,
            },
          },
        },
      },
      taskTemplates: {
        select: {
          id: true,
          name: true,
        },
      },
    },
    orderBy: {
      createdAt: "asc",
    },
  });

  return <ControlsClientPage initialControls={controls} />;
}
