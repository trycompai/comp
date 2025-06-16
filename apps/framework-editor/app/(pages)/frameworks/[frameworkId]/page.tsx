import { db } from "@comp/db";
import { notFound, redirect } from "next/navigation";
import { FrameworkRequirementsClientPage } from "./FrameworkRequirementsClientPage";
import type {
  FrameworkEditorFramework,
  FrameworkEditorRequirement,
} from "@prisma/client";
import { isAuthorized } from "@/app/lib/utils";

interface PageProps {
  params: Promise<{
    frameworkId: string;
  }>;
}

export default async function Page({ params }: PageProps) {
  const isAllowed = await isAuthorized();

  if (!isAllowed) {
    redirect("/auth");
  }

  const { frameworkId } = await params;

  const framework = await db.frameworkEditorFramework.findUnique({
    where: {
      id: frameworkId,
    },
    select: {
      id: true,
      name: true,
      version: true,
      description: true,
      visible: true,
      requirements: {
        orderBy: {
          name: "asc",
        },
        include: {
          controlTemplates: true,
        },
      },
    },
  });

  if (!framework) {
    notFound();
  }

  const { id, name, version, description, visible, requirements } = framework;

  return (
    <FrameworkRequirementsClientPage
      frameworkDetails={{ id, name, version, description, visible }}
      initialRequirements={requirements}
    />
  );
}
