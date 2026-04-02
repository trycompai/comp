import { Command } from 'commander';
import { apiRequest } from '../lib/api-client.js';
import { handleError, CliError } from '../lib/errors.js';
import { outputResult, outputSuccess } from '../lib/output.js';
import type { TaskTemplate } from '../types.js';
import { FREQUENCY_VALUES, DEPARTMENT_VALUES, AUTOMATION_STATUS_VALUES } from '../types.js';

export function registerTaskCommands(parent: Command): void {
  const task = parent
    .command('task')
    .description(
      'Manage task templates. Tasks represent recurring compliance activities ' +
        '(e.g. "Review access logs quarterly") linked to control templates. ' +
        'Each task has an optional frequency, department, and automation status.',
    );

  task
    .command('list')
    .description('List task templates. Optionally filter by framework.')
    .option('--framework-id <id>', 'Filter tasks by framework ID')
    .action(async (opts, cmd) => {
      const json = cmd.optsWithGlobals().json as boolean;
      try {
        const data = await apiRequest<TaskTemplate[]>('/task-template', {
          query: { frameworkId: opts.frameworkId },
          apiUrl: cmd.optsWithGlobals().apiUrl,
        });
        outputResult(data, { json });
      } catch (error) {
        handleError(error, json);
      }
    });

  task
    .command('get')
    .argument('<id>', 'Task template ID')
    .description(
      'Get a single task template by ID. Returns full details including ' +
        'linked control templates.',
    )
    .action(async (id: string, _opts, cmd) => {
      const json = cmd.optsWithGlobals().json as boolean;
      try {
        const data = await apiRequest<TaskTemplate>(`/task-template/${id}`, {
          apiUrl: cmd.optsWithGlobals().apiUrl,
        });
        outputResult(data, { json });
      } catch (error) {
        handleError(error, json);
      }
    });

  task
    .command('create')
    .description(
      'Create a new task template. If --framework-id is provided, the task ' +
        'is automatically linked to that framework.',
    )
    .requiredOption('--name <name>', 'Task name (e.g. "Review access control logs")')
    .option('--description <text>', 'Task description')
    .option(
      '--frequency <value>',
      `Task frequency (choices: ${FREQUENCY_VALUES.join(', ')})`,
    )
    .option(
      '--department <value>',
      `Responsible department (choices: ${DEPARTMENT_VALUES.join(', ')})`,
    )
    .option(
      '--automation-status <value>',
      `Automation status (choices: ${AUTOMATION_STATUS_VALUES.join(', ')}). Applied via update after creation.`,
    )
    .option('--framework-id <id>', 'Framework ID to auto-link the task to')
    .action(async (opts, cmd) => {
      const json = cmd.optsWithGlobals().json as boolean;
      try {
        if (opts.frequency) validateEnum('frequency', opts.frequency, FREQUENCY_VALUES);
        if (opts.department) validateEnum('department', opts.department, DEPARTMENT_VALUES);
        if (opts.automationStatus) validateEnum('automation-status', opts.automationStatus, AUTOMATION_STATUS_VALUES);
        const body: Record<string, unknown> = { name: opts.name };
        if (opts.description !== undefined) body.description = opts.description;
        if (opts.frequency !== undefined) body.frequency = opts.frequency;
        if (opts.department !== undefined) body.department = opts.department;
        let data = await apiRequest<TaskTemplate>('/task-template', {
          method: 'POST',
          body,
          query: { frameworkId: opts.frameworkId },
          apiUrl: cmd.optsWithGlobals().apiUrl,
        });
        if (opts.automationStatus) {
          data = await apiRequest<TaskTemplate>(`/task-template/${data.id}`, {
            method: 'PATCH',
            body: { automationStatus: opts.automationStatus },
            apiUrl: cmd.optsWithGlobals().apiUrl,
          });
        }
        outputResult(data, { json });
      } catch (error) {
        handleError(error, json);
      }
    });

  task
    .command('update')
    .argument('<id>', 'Task template ID to update')
    .description('Update a task template. Only provided fields are changed.')
    .option('--name <name>', 'New task name')
    .option('--description <text>', 'New description')
    .option(
      '--frequency <value>',
      `Task frequency (choices: ${FREQUENCY_VALUES.join(', ')})`,
    )
    .option(
      '--department <value>',
      `Responsible department (choices: ${DEPARTMENT_VALUES.join(', ')})`,
    )
    .option(
      '--automation-status <value>',
      `Automation status (choices: ${AUTOMATION_STATUS_VALUES.join(', ')})`,
    )
    .action(async (id: string, opts, cmd) => {
      const json = cmd.optsWithGlobals().json as boolean;
      try {
        const body: Record<string, unknown> = {};
        if (opts.name !== undefined) body.name = opts.name;
        if (opts.description !== undefined) body.description = opts.description;
        if (opts.frequency !== undefined) {
          validateEnum('frequency', opts.frequency, FREQUENCY_VALUES);
          body.frequency = opts.frequency;
        }
        if (opts.department !== undefined) {
          validateEnum('department', opts.department, DEPARTMENT_VALUES);
          body.department = opts.department;
        }
        if (opts.automationStatus !== undefined) {
          validateEnum('automation-status', opts.automationStatus, AUTOMATION_STATUS_VALUES);
          body.automationStatus = opts.automationStatus;
        }
        const data = await apiRequest<TaskTemplate>(`/task-template/${id}`, {
          method: 'PATCH',
          body,
          apiUrl: cmd.optsWithGlobals().apiUrl,
        });
        outputResult(data, { json });
      } catch (error) {
        handleError(error, json);
      }
    });

  task
    .command('delete')
    .argument('<id>', 'Task template ID to delete')
    .description('Delete a task template permanently. This cannot be undone.')
    .action(async (id: string, _opts, cmd) => {
      const json = cmd.optsWithGlobals().json as boolean;
      try {
        await apiRequest(`/task-template/${id}`, {
          method: 'DELETE',
          apiUrl: cmd.optsWithGlobals().apiUrl,
        });
        outputSuccess(`Task template ${id} deleted.`, { json });
      } catch (error) {
        handleError(error, json);
      }
    });
}

function validateEnum(field: string, value: string, allowed: readonly string[]): void {
  if (!allowed.includes(value)) {
    throw new CliError(
      `Invalid ${field}: "${value}". Must be one of: ${allowed.join(', ')}`,
    );
  }
}
