import { Command } from 'commander';
import { readFileSync } from 'node:fs';
import { apiRequest } from '../lib/api-client.js';
import { handleError, CliError } from '../lib/errors.js';
import { outputResult, outputSuccess } from '../lib/output.js';
import type { PolicyTemplate } from '../types.js';
import { FREQUENCY_VALUES, DEPARTMENT_VALUES } from '../types.js';

export function registerPolicyCommands(parent: Command): void {
  const pol = parent
    .command('policy')
    .alias('pol')
    .description(
      'Manage policy templates. Policies define organizational rules and procedures ' +
        '(e.g. "Access Control Policy") that are linked to control templates. ' +
        'Each policy has a frequency, department, and rich-text content body.',
    );

  pol
    .command('list')
    .description('List policy templates. Optionally filter by framework.')
    .option('--framework-id <id>', 'Filter policies by framework ID')
    .option('--take <number>', 'Maximum number of results (default: 100)', '100')
    .option('--skip <number>', 'Number of results to skip (default: 0)', '0')
    .action(async (opts, cmd) => {
      const json = cmd.optsWithGlobals().json as boolean;
      try {
        const data = await apiRequest<PolicyTemplate[]>('/policy-template', {
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

  pol
    .command('get')
    .argument('<id>', 'Policy template ID')
    .description(
      'Get a single policy template by ID. Returns full details including content body ' +
        'and linked control templates.',
    )
    .action(async (id: string, _opts, cmd) => {
      const json = cmd.optsWithGlobals().json as boolean;
      try {
        const data = await apiRequest<PolicyTemplate>(`/policy-template/${id}`, {
          apiUrl: cmd.optsWithGlobals().apiUrl,
        });
        outputResult(data, { json });
      } catch (error) {
        handleError(error, json);
      }
    });

  pol
    .command('create')
    .description(
      'Create a new policy template. If --framework-id is provided, the policy ' +
        'is automatically linked to that framework.',
    )
    .requiredOption('--name <name>', 'Policy name (e.g. "Information Security Policy")')
    .requiredOption('--description <text>', 'Policy description')
    .requiredOption(
      '--frequency <value>',
      `Review frequency (choices: ${FREQUENCY_VALUES.join(', ')})`,
    )
    .requiredOption(
      '--department <value>',
      `Responsible department (choices: ${DEPARTMENT_VALUES.join(', ')})`,
    )
    .option('--framework-id <id>', 'Framework ID to auto-link the policy to')
    .action(async (opts, cmd) => {
      const json = cmd.optsWithGlobals().json as boolean;
      try {
        validateEnum('frequency', opts.frequency, FREQUENCY_VALUES);
        validateEnum('department', opts.department, DEPARTMENT_VALUES);
        const data = await apiRequest<PolicyTemplate>('/policy-template', {
          method: 'POST',
          body: {
            name: opts.name,
            description: opts.description,
            frequency: opts.frequency,
            department: opts.department,
          },
          query: { frameworkId: opts.frameworkId },
          apiUrl: cmd.optsWithGlobals().apiUrl,
        });
        outputResult(data, { json });
      } catch (error) {
        handleError(error, json);
      }
    });

  pol
    .command('update')
    .argument('<id>', 'Policy template ID to update')
    .description('Update a policy template. Only provided fields are changed.')
    .option('--name <name>', 'New policy name')
    .option('--description <text>', 'New description')
    .option(
      '--frequency <value>',
      `Review frequency (choices: ${FREQUENCY_VALUES.join(', ')})`,
    )
    .option(
      '--department <value>',
      `Responsible department (choices: ${DEPARTMENT_VALUES.join(', ')})`,
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
        const data = await apiRequest<PolicyTemplate>(`/policy-template/${id}`, {
          method: 'PATCH',
          body,
          apiUrl: cmd.optsWithGlobals().apiUrl,
        });
        outputResult(data, { json });
      } catch (error) {
        handleError(error, json);
      }
    });

  pol
    .command('update-content')
    .argument('<id>', 'Policy template ID')
    .description(
      'Update the rich-text content body of a policy template. ' +
        'Content is TipTap-compatible JSON. Provide via --file (path to .json file) ' +
        'or --content (inline JSON string). Max size: ~500KB.',
    )
    .option('--file <path>', 'Path to a JSON file containing the policy content')
    .option('--content <json>', 'Inline JSON string for the policy content')
    .action(async (id: string, opts, cmd) => {
      const json = cmd.optsWithGlobals().json as boolean;
      try {
        let content: Record<string, unknown>;
        if (opts.file) {
          const raw = readFileSync(opts.file, 'utf-8');
          content = JSON.parse(raw) as Record<string, unknown>;
        } else if (opts.content) {
          content = JSON.parse(opts.content) as Record<string, unknown>;
        } else {
          throw new CliError('Provide either --file <path> or --content <json>.');
        }
        const data = await apiRequest<PolicyTemplate>(`/policy-template/${id}/content`, {
          method: 'PATCH',
          body: { content },
          apiUrl: cmd.optsWithGlobals().apiUrl,
        });
        outputResult(data, { json });
      } catch (error) {
        handleError(error, json);
      }
    });

  pol
    .command('delete')
    .argument('<id>', 'Policy template ID to delete')
    .description('Delete a policy template permanently. This cannot be undone.')
    .action(async (id: string, _opts, cmd) => {
      const json = cmd.optsWithGlobals().json as boolean;
      try {
        await apiRequest(`/policy-template/${id}`, {
          method: 'DELETE',
          apiUrl: cmd.optsWithGlobals().apiUrl,
        });
        outputSuccess(`Policy template ${id} deleted.`, { json });
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
