import { Command } from 'commander';
import { apiRequest } from '../lib/api-client.js';
import { handleError } from '../lib/errors.js';
import { outputResult, outputSuccess } from '../lib/output.js';
import type { Framework, FrameworkWithCounts, ControlDocument } from '../types.js';

export function registerFrameworkCommands(parent: Command): void {
  const fw = parent
    .command('framework')
    .alias('fw')
    .description(
      'Manage framework templates. Frameworks are top-level compliance standards ' +
        '(e.g. SOC 2, ISO 27001) that contain requirements, controls, policies, and tasks.',
    );

  fw.command('list')
    .description(
      'List all framework templates. Returns id, name, version, description, and visibility status.',
    )
    .option('--take <number>', 'Maximum number of results to return (default: 100)', '100')
    .option('--skip <number>', 'Number of results to skip for pagination (default: 0)', '0')
    .action(async (opts, cmd) => {
      const json = cmd.optsWithGlobals().json as boolean;
      try {
        const data = await apiRequest<FrameworkWithCounts[]>('/framework', {
          query: { take: opts.take, skip: opts.skip },
          apiUrl: cmd.optsWithGlobals().apiUrl,
        });
        outputResult(data, { json });
      } catch (error) {
        handleError(error, json);
      }
    });

  fw.command('get')
    .argument('<id>', 'Framework ID (e.g. "fe_cm...")')
    .description(
      'Get a single framework by ID. Returns full details including nested requirements ' +
        'with their linked control templates.',
    )
    .action(async (id: string, _opts, cmd) => {
      const json = cmd.optsWithGlobals().json as boolean;
      try {
        const data = await apiRequest<Framework>(`/framework/${id}`, {
          apiUrl: cmd.optsWithGlobals().apiUrl,
        });
        outputResult(data, { json });
      } catch (error) {
        handleError(error, json);
      }
    });

  fw.command('create')
    .description(
      'Create a new framework template. Requires name, version, and description. ' +
        'The framework is hidden (visible=false) by default until explicitly made visible.',
    )
    .requiredOption('--name <name>', 'Framework name (e.g. "SOC 2 Type II")')
    .requiredOption('--version <version>', 'Framework version (e.g. "2024")')
    .requiredOption('--description <text>', 'Framework description')
    .option('--visible', 'Make the framework visible to organizations immediately', false)
    .action(async (opts, cmd) => {
      const json = cmd.optsWithGlobals().json as boolean;
      try {
        const data = await apiRequest<Framework>('/framework', {
          method: 'POST',
          body: {
            name: opts.name,
            version: opts.version,
            description: opts.description,
            visible: opts.visible,
          },
          apiUrl: cmd.optsWithGlobals().apiUrl,
        });
        outputResult(data, { json });
      } catch (error) {
        handleError(error, json);
      }
    });

  fw.command('update')
    .argument('<id>', 'Framework ID to update')
    .description(
      'Update a framework template. All fields are optional; only provided fields are changed.',
    )
    .option('--name <name>', 'New framework name')
    .option('--version <version>', 'New framework version')
    .option('--description <text>', 'New framework description')
    .option('--visible', 'Make the framework visible')
    .option('--no-visible', 'Hide the framework')
    .action(async (id: string, opts, cmd) => {
      const json = cmd.optsWithGlobals().json as boolean;
      try {
        const body: Record<string, unknown> = {};
        if (opts.name !== undefined) body.name = opts.name;
        if (opts.version !== undefined) body.version = opts.version;
        if (opts.description !== undefined) body.description = opts.description;
        if (opts.visible !== undefined) body.visible = opts.visible;
        const data = await apiRequest<Framework>(`/framework/${id}`, {
          method: 'PATCH',
          body,
          apiUrl: cmd.optsWithGlobals().apiUrl,
        });
        outputResult(data, { json });
      } catch (error) {
        handleError(error, json);
      }
    });

  fw.command('delete')
    .argument('<id>', 'Framework ID to delete')
    .description('Delete a framework template permanently. This cannot be undone.')
    .action(async (id: string, _opts, cmd) => {
      const json = cmd.optsWithGlobals().json as boolean;
      try {
        await apiRequest(`/framework/${id}`, {
          method: 'DELETE',
          apiUrl: cmd.optsWithGlobals().apiUrl,
        });
        outputSuccess(`Framework ${id} deleted.`, { json });
      } catch (error) {
        handleError(error, json);
      }
    });

  fw.command('documents')
    .argument('<id>', 'Framework ID')
    .description(
      'List the document type matrix for a framework. Shows each control template ' +
        'linked to the framework and its associated evidence document types ' +
        '(e.g. penetration_test, rbac_matrix). Document types are managed via ' +
        'the "control update --document-types" or "control add-document-type" commands.',
    )
    .action(async (id: string, _opts, cmd) => {
      const json = cmd.optsWithGlobals().json as boolean;
      try {
        const data = await apiRequest<ControlDocument[]>(`/framework/${id}/documents`, {
          apiUrl: cmd.optsWithGlobals().apiUrl,
        });
        outputResult(data, { json });
      } catch (error) {
        handleError(error, json);
      }
    });

  fw.command('link-control')
    .argument('<framework-id>', 'Framework ID')
    .argument('<control-id>', 'Control template ID to link')
    .description(
      'Link an existing control template to this framework. ' +
        'WARNING: This auto-links the control to ALL requirements in the framework. ' +
        'For precise linking, use "control link-requirement" instead.',
    )
    .action(async (frameworkId: string, controlId: string, _opts, cmd) => {
      const json = cmd.optsWithGlobals().json as boolean;
      try {
        await apiRequest(`/framework/${frameworkId}/link-control/${controlId}`, {
          method: 'POST',
          apiUrl: cmd.optsWithGlobals().apiUrl,
        });
        outputSuccess(`Control ${controlId} linked to framework ${frameworkId}.`, { json });
      } catch (error) {
        handleError(error, json);
      }
    });

  fw.command('link-task')
    .argument('<framework-id>', 'Framework ID')
    .argument('<task-id>', 'Task template ID to link')
    .description(
      'Link an existing task template to this framework. ' +
        'WARNING: This auto-links the task to ALL controls in the framework. ' +
        'For precise linking, use "control link-task" instead.',
    )
    .action(async (frameworkId: string, taskId: string, _opts, cmd) => {
      const json = cmd.optsWithGlobals().json as boolean;
      try {
        await apiRequest(`/framework/${frameworkId}/link-task/${taskId}`, {
          method: 'POST',
          apiUrl: cmd.optsWithGlobals().apiUrl,
        });
        outputSuccess(`Task ${taskId} linked to framework ${frameworkId}.`, { json });
      } catch (error) {
        handleError(error, json);
      }
    });

  fw.command('link-policy')
    .argument('<framework-id>', 'Framework ID')
    .argument('<policy-id>', 'Policy template ID to link')
    .description(
      'Link an existing policy template to this framework. ' +
        'WARNING: This auto-links the policy to ALL controls in the framework. ' +
        'For precise linking, use "control link-policy" instead.',
    )
    .action(async (frameworkId: string, policyId: string, _opts, cmd) => {
      const json = cmd.optsWithGlobals().json as boolean;
      try {
        await apiRequest(`/framework/${frameworkId}/link-policy/${policyId}`, {
          method: 'POST',
          apiUrl: cmd.optsWithGlobals().apiUrl,
        });
        outputSuccess(`Policy ${policyId} linked to framework ${frameworkId}.`, { json });
      } catch (error) {
        handleError(error, json);
      }
    });
}
