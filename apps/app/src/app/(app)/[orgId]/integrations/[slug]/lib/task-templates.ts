/**
 * Shared task-template projection for the integration detail pages.
 * Resolves the org's tasks into { templateId -> live task } rows and reports
 * whether the tasks fetch errored (so the UI can distinguish "not added" from
 * "couldn't load").
 */
export interface IntegrationTaskApiResponse {
  data: Array<{
    id: string;
    title: string;
    description: string;
    taskTemplateId: string | null;
  }>;
}

export interface MappedTaskTemplate {
  id: string;
  taskId: string;
  name: string;
  description: string;
}

export function mapTaskTemplates(
  tasksResult: { data?: IntegrationTaskApiResponse | null; error?: unknown },
  opts: { sort?: boolean } = {},
): { templates: MappedTaskTemplate[]; errored: boolean } {
  const errored = Boolean(tasksResult.error);
  const templates = (tasksResult.data?.data ?? [])
    .filter((task) => task.taskTemplateId)
    .map((task) => ({
      id: task.taskTemplateId as string,
      taskId: task.id,
      name: task.title,
      description: task.description,
    }));
  if (opts.sort) templates.sort((a, b) => a.name.localeCompare(b.name));
  return { templates, errored };
}
