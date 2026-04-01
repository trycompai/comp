import { Command } from 'commander';
import { apiRequest } from '../lib/api-client.js';
import { handleError } from '../lib/errors.js';
import { outputResult, outputSuccess } from '../lib/output.js';
import type { Requirement } from '../types.js';

export function registerRequirementCommands(parent: Command): void {
  const req = parent
    .command('requirement')
    .alias('req')
    .description(
      'Manage framework requirements. Requirements are specific compliance obligations ' +
        '(e.g. "CC1.1") within a framework that map to control templates.',
    );

  req
    .command('list')
    .description(
      'List all requirements across all frameworks. Each requirement shows its framework ' +
        'association, identifier, name, and description.',
    )
    .option('--take <number>', 'Maximum number of results to return (default: 100)', '100')
    .option('--skip <number>', 'Number of results to skip for pagination (default: 0)', '0')
    .action(async (opts, cmd) => {
      const json = cmd.optsWithGlobals().json as boolean;
      try {
        const data = await apiRequest<Requirement[]>('/requirement', {
          query: { take: opts.take, skip: opts.skip },
          apiUrl: cmd.optsWithGlobals().apiUrl,
        });
        outputResult(data, { json });
      } catch (error) {
        handleError(error, json);
      }
    });

  req
    .command('create')
    .description(
      'Create a new requirement within a framework. The requirement will be linked to ' +
        'the specified framework. Use --identifier for the standard reference code (e.g. "CC1.1").',
    )
    .requiredOption('--framework-id <id>', 'ID of the framework this requirement belongs to')
    .requiredOption('--name <name>', 'Requirement name (e.g. "Control Environment")')
    .requiredOption('--description <text>', 'Detailed description of the requirement')
    .option(
      '--identifier <code>',
      'Standard reference code (e.g. "CC1.1", "A.5.1"). Optional but recommended.',
    )
    .action(async (opts, cmd) => {
      const json = cmd.optsWithGlobals().json as boolean;
      try {
        const data = await apiRequest<Requirement>('/requirement', {
          method: 'POST',
          body: {
            frameworkId: opts.frameworkId,
            name: opts.name,
            description: opts.description,
            identifier: opts.identifier,
          },
          apiUrl: cmd.optsWithGlobals().apiUrl,
        });
        outputResult(data, { json });
      } catch (error) {
        handleError(error, json);
      }
    });

  req
    .command('update')
    .argument('<id>', 'Requirement ID to update')
    .description('Update a requirement. Only provided fields are changed.')
    .option('--name <name>', 'New requirement name')
    .option('--identifier <code>', 'New standard reference code')
    .option('--description <text>', 'New description')
    .action(async (id: string, opts, cmd) => {
      const json = cmd.optsWithGlobals().json as boolean;
      try {
        const body: Record<string, unknown> = {};
        if (opts.name !== undefined) body.name = opts.name;
        if (opts.identifier !== undefined) body.identifier = opts.identifier;
        if (opts.description !== undefined) body.description = opts.description;
        const data = await apiRequest<Requirement>(`/requirement/${id}`, {
          method: 'PATCH',
          body,
          apiUrl: cmd.optsWithGlobals().apiUrl,
        });
        outputResult(data, { json });
      } catch (error) {
        handleError(error, json);
      }
    });

  req
    .command('delete')
    .argument('<id>', 'Requirement ID to delete')
    .description('Delete a requirement permanently. This cannot be undone.')
    .action(async (id: string, _opts, cmd) => {
      const json = cmd.optsWithGlobals().json as boolean;
      try {
        await apiRequest(`/requirement/${id}`, {
          method: 'DELETE',
          apiUrl: cmd.optsWithGlobals().apiUrl,
        });
        outputSuccess(`Requirement ${id} deleted.`, { json });
      } catch (error) {
        handleError(error, json);
      }
    });
}
