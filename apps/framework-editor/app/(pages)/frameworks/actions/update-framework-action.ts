"use server";

import { z } from "zod";
import { db } from "@comp/db";
import { revalidatePath } from "next/cache";
import type { FrameworkEditorFramework } from "@prisma/client";
import { FrameworkBaseSchema } from "../schemas";

const UpdateFrameworkSchema = FrameworkBaseSchema.extend({
  id: z.string().min(1, { message: "Framework ID is required." }),
});

export interface UpdateFrameworkActionState {
  success: boolean;
  data?: Pick<
    FrameworkEditorFramework,
    "id" | "name" | "description" | "version" | "visible"
  >;
  error?: string;
  issues?: z.ZodIssue[];
}

export async function updateFrameworkAction(
  prevState: UpdateFrameworkActionState | null,
  formData: FormData,
): Promise<UpdateFrameworkActionState> {
  const rawInput = {
    id: formData.get("id"),
    name: formData.get("name"),
    description: formData.get("description"),
    version: formData.get("version"),
    visible: formData.get("visible") === "true",
  };

  const validationResult = UpdateFrameworkSchema.safeParse(rawInput);

  if (!validationResult.success) {
    return {
      success: false,
      error: "Invalid input.",
      issues: validationResult.error.issues,
    };
  }

  const { id, name, description, version, visible } = validationResult.data;

  try {
    const existingFramework = await db.frameworkEditorFramework.findUnique({
      where: { id },
    });

    if (!existingFramework) {
      return { success: false, error: "Framework not found." };
    }

    const updatedFramework = await db.frameworkEditorFramework.update({
      where: { id },
      data: {
        name,
        description,
        version,
        visible,
      },
      select: {
        id: true,
        name: true,
        description: true,
        version: true,
        visible: true,
      },
    });

    revalidatePath("/frameworks");
    revalidatePath(`/frameworks/${id}`);

    return { success: true, data: updatedFramework };
  } catch (error) {
    console.error("Failed to update framework:", error);
    return {
      success: false,
      error: "Failed to update framework in the database. Please try again.",
    };
  }
}
