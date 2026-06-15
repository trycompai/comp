import type { Command } from 'commander';
import { apiRequest } from '../lib/api-client.js';
import { handleError, CliError } from '../lib/errors.js';
import { outputSuccess } from '../lib/output.js';
import { EVIDENCE_FORM_TYPE_VALUES } from '../types.js';

export function registerControlRelationCommands(ctl: Command): void {
  ctl
    .command('link-requirement')
    .argument('<control-id>', 'Control template ID')
    .argument('<requirement-id>', 'Requirement ID to link')
    .description('Link a requirement to this control template (many-to-many relationship).')
    .action(async (controlId: string, requirementId: string, _opts, cmd) => {
      const json = cmd.optsWithGlobals().json as boolean;
      try {
        await apiRequest(`/control-template/${controlId}/requirements/${requirementId}`, {
          method: 'POST',
          apiUrl: cmd.optsWithGlobals().apiUrl,
        });
        outputSuccess(`Requirement ${requirementId} linked to control ${controlId}.`, { json });
      } catch (error) {
        handleError(error, json);
      }
    });

  ctl
    .command('unlink-requirement')
    .argument('<control-id>', 'Control template ID')
    .argument('<requirement-id>', 'Requirement ID to unlink')
    .description('Remove the link between a requirement and this control template.')
    .action(async (controlId: string, requirementId: string, _opts, cmd) => {
      const json = cmd.optsWithGlobals().json as boolean;
      try {
        await apiRequest(`/control-template/${controlId}/requirements/${requirementId}`, {
          method: 'DELETE',
          apiUrl: cmd.optsWithGlobals().apiUrl,
        });
        outputSuccess(`Requirement ${requirementId} unlinked from control ${controlId}.`, {
          json,
        });
      } catch (error) {
        handleError(error, json);
      }
    });

  ctl
    .command('link-policy')
    .argument('<control-id>', 'Control template ID')
    .argument('<policy-id>', 'Policy template ID to link')
    .requiredOption('--framework-id <id>', 'Framework the link is scoped to (required by the API)')
    .description('Link a policy template to this control, scoped to a framework.')
    .action(async (controlId: string, policyId: string, opts, cmd) => {
      const json = cmd.optsWithGlobals().json as boolean;
      try {
        await apiRequest(`/control-template/${controlId}/policy-templates/${policyId}`, {
          method: 'POST',
          query: { frameworkId: opts.frameworkId },
          apiUrl: cmd.optsWithGlobals().apiUrl,
        });
        outputSuccess(`Policy ${policyId} linked to control ${controlId}.`, { json });
      } catch (error) {
        handleError(error, json);
      }
    });

  ctl
    .command('unlink-policy')
    .argument('<control-id>', 'Control template ID')
    .argument('<policy-id>', 'Policy template ID to unlink')
    .requiredOption('--framework-id <id>', 'Framework the link is scoped to (required by the API)')
    .description('Remove the framework-scoped link between a policy template and this control.')
    .action(async (controlId: string, policyId: string, opts, cmd) => {
      const json = cmd.optsWithGlobals().json as boolean;
      try {
        await apiRequest(`/control-template/${controlId}/policy-templates/${policyId}`, {
          method: 'DELETE',
          query: { frameworkId: opts.frameworkId },
          apiUrl: cmd.optsWithGlobals().apiUrl,
        });
        outputSuccess(`Policy ${policyId} unlinked from control ${controlId}.`, { json });
      } catch (error) {
        handleError(error, json);
      }
    });

  ctl
    .command('link-task')
    .argument('<control-id>', 'Control template ID')
    .argument('<task-id>', 'Task template ID to link')
    .requiredOption('--framework-id <id>', 'Framework the link is scoped to (required by the API)')
    .description('Link a task template to this control, scoped to a framework.')
    .action(async (controlId: string, taskId: string, opts, cmd) => {
      const json = cmd.optsWithGlobals().json as boolean;
      try {
        await apiRequest(`/control-template/${controlId}/task-templates/${taskId}`, {
          method: 'POST',
          query: { frameworkId: opts.frameworkId },
          apiUrl: cmd.optsWithGlobals().apiUrl,
        });
        outputSuccess(`Task ${taskId} linked to control ${controlId}.`, { json });
      } catch (error) {
        handleError(error, json);
      }
    });

  ctl
    .command('unlink-task')
    .argument('<control-id>', 'Control template ID')
    .argument('<task-id>', 'Task template ID to unlink')
    .requiredOption('--framework-id <id>', 'Framework the link is scoped to (required by the API)')
    .description('Remove the framework-scoped link between a task template and this control.')
    .action(async (controlId: string, taskId: string, opts, cmd) => {
      const json = cmd.optsWithGlobals().json as boolean;
      try {
        await apiRequest(`/control-template/${controlId}/task-templates/${taskId}`, {
          method: 'DELETE',
          query: { frameworkId: opts.frameworkId },
          apiUrl: cmd.optsWithGlobals().apiUrl,
        });
        outputSuccess(`Task ${taskId} unlinked from control ${controlId}.`, { json });
      } catch (error) {
        handleError(error, json);
      }
    });

  ctl
    .command('add-document-type')
    .argument('<control-id>', 'Control template ID')
    .argument('<document-type>', `Document type to add (${EVIDENCE_FORM_TYPE_VALUES.join(', ')})`)
    .requiredOption('--framework-id <id>', 'Framework the document-type link is scoped to (required by the API)')
    .description(
      'Add an evidence document type to a control template, scoped to a framework. ' +
        'Idempotent: the API skips duplicates. Use "framework documents <id>" to see the matrix.',
    )
    .action(async (controlId: string, documentType: string, opts, cmd) => {
      const json = cmd.optsWithGlobals().json as boolean;
      try {
        if (!EVIDENCE_FORM_TYPE_VALUES.includes(documentType as never)) {
          throw new CliError(
            `Invalid document type: "${documentType}". Must be one of: ${EVIDENCE_FORM_TYPE_VALUES.join(', ')}`,
          );
        }
        await apiRequest(`/control-template/${controlId}/document-types/${documentType}`, {
          method: 'POST',
          query: { frameworkId: opts.frameworkId },
          apiUrl: cmd.optsWithGlobals().apiUrl,
        });
        outputSuccess(`Document type "${documentType}" linked to control ${controlId}.`, { json });
      } catch (error) {
        handleError(error, json);
      }
    });

  ctl
    .command('remove-document-type')
    .argument('<control-id>', 'Control template ID')
    .argument('<document-type>', `Document type to remove (${EVIDENCE_FORM_TYPE_VALUES.join(', ')})`)
    .requiredOption('--framework-id <id>', 'Framework the document-type link is scoped to (required by the API)')
    .description('Remove a framework-scoped evidence document type from a control template.')
    .action(async (controlId: string, documentType: string, opts, cmd) => {
      const json = cmd.optsWithGlobals().json as boolean;
      try {
        await apiRequest(`/control-template/${controlId}/document-types/${documentType}`, {
          method: 'DELETE',
          query: { frameworkId: opts.frameworkId },
          apiUrl: cmd.optsWithGlobals().apiUrl,
        });
        outputSuccess(`Document type "${documentType}" unlinked from control ${controlId}.`, { json });
      } catch (error) {
        handleError(error, json);
      }
    });
}
