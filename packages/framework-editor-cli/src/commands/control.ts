import { Command } from 'commander';
import { apiRequest } from '../lib/api-client.js';
import { handleError } from '../lib/errors.js';
import { outputResult, outputSuccess } from '../lib/output.js';
import type { ControlTemplate } from '../types.js';
import { EVIDENCE_FORM_TYPE_VALUES } from '../types.js';
import { registerControlRelationCommands } from './control-relations.js';

export function registerControlCommands(parent: Command): void {
  const ctl = parent
    .command('control')
    .alias('ctl')
    .description(
      'Manage control templates. Controls are security/compliance measures that satisfy ' +
        'framework requirements. Controls can link to policies, tasks, requirements, ' +
        'and evidence document types.',
    );

  ctl
    .command('list')
    .description(
      'List control templates. Optionally filter by framework. ' +
        'Returns id, name, description, and document types.',
    )
    .option('--framework-id <id>', 'Filter controls by framework ID')
    .option('--take <number>', 'Maximum number of results (default: 100)', '100')
    .option('--skip <number>', 'Number of results to skip (default: 0)', '0')
    .action(async (opts, cmd) => {
      const json = cmd.optsWithGlobals().json as boolean;
      try {
        const data = await apiRequest<ControlTemplate[]>('/control-template', {
          query: {
            frameworkId: opts.frameworkId,
            take: opts.take,
            skip: opts.skip,
          },
          apiUrl: cmd.optsWithGlobals().apiUrl,
        });
        outputResult(data, { json });
      } catch (error) {
        handleError(error, json);
      }
    });

  ctl
    .command('get')
    .argument('<id>', 'Control template ID')
    .description(
      'Get a single control template by ID. Returns full details including ' +
        'linked requirements, policies, tasks, and document types.',
    )
    .action(async (id: string, _opts, cmd) => {
      const json = cmd.optsWithGlobals().json as boolean;
      try {
        const data = await apiRequest<ControlTemplate>(`/control-template/${id}`, {
          apiUrl: cmd.optsWithGlobals().apiUrl,
        });
        outputResult(data, { json });
      } catch (error) {
        handleError(error, json);
      }
    });

  ctl
    .command('create')
    .description(
      'Create a new control template. If --framework-id is provided, the control ' +
        'is automatically linked to all requirements of that framework.',
    )
    .requiredOption('--name <name>', 'Control name (e.g. "Access Control Policy")')
    .requiredOption('--description <text>', 'Control description')
    .option(
      '--document-types <types>',
      `Comma-separated evidence document types. Valid values: ${EVIDENCE_FORM_TYPE_VALUES.join(', ')}`,
    )
    .option(
      '--framework-id <id>',
      'Framework ID. When set, auto-links the control to all requirements in that framework.',
    )
    .action(async (opts, cmd) => {
      const json = cmd.optsWithGlobals().json as boolean;
      try {
        const body: Record<string, unknown> = {
          name: opts.name,
          description: opts.description,
        };
        if (opts.documentTypes) {
          body.documentTypes = (opts.documentTypes as string).split(',').map((s: string) => s.trim());
        }
        const data = await apiRequest<ControlTemplate>('/control-template', {
          method: 'POST',
          body,
          query: { frameworkId: opts.frameworkId },
          apiUrl: cmd.optsWithGlobals().apiUrl,
        });
        outputResult(data, { json });
      } catch (error) {
        handleError(error, json);
      }
    });

  ctl
    .command('update')
    .argument('<id>', 'Control template ID to update')
    .description('Update a control template. Only provided fields are changed.')
    .option('--name <name>', 'New control name')
    .option('--description <text>', 'New description')
    .option(
      '--document-types <types>',
      `Comma-separated evidence document types. Valid values: ${EVIDENCE_FORM_TYPE_VALUES.join(', ')}`,
    )
    .action(async (id: string, opts, cmd) => {
      const json = cmd.optsWithGlobals().json as boolean;
      try {
        const body: Record<string, unknown> = {};
        if (opts.name !== undefined) body.name = opts.name;
        if (opts.description !== undefined) body.description = opts.description;
        if (opts.documentTypes) {
          body.documentTypes = (opts.documentTypes as string).split(',').map((s: string) => s.trim());
        }
        const data = await apiRequest<ControlTemplate>(`/control-template/${id}`, {
          method: 'PATCH',
          body,
          apiUrl: cmd.optsWithGlobals().apiUrl,
        });
        outputResult(data, { json });
      } catch (error) {
        handleError(error, json);
      }
    });

  ctl
    .command('delete')
    .argument('<id>', 'Control template ID to delete')
    .description('Delete a control template permanently. This cannot be undone.')
    .action(async (id: string, _opts, cmd) => {
      const json = cmd.optsWithGlobals().json as boolean;
      try {
        await apiRequest(`/control-template/${id}`, {
          method: 'DELETE',
          apiUrl: cmd.optsWithGlobals().apiUrl,
        });
        outputSuccess(`Control template ${id} deleted.`, { json });
      } catch (error) {
        handleError(error, json);
      }
    });

  registerControlRelationCommands(ctl);
}
