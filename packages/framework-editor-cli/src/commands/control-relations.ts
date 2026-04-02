import type { Command } from 'commander';
import { apiRequest } from '../lib/api-client.js';
import { handleError, CliError } from '../lib/errors.js';
import { outputResult, outputSuccess } from '../lib/output.js';
import type { ControlTemplate } from '../types.js';
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
    .description('Link a policy template to this control (many-to-many relationship).')
    .action(async (controlId: string, policyId: string, _opts, cmd) => {
      const json = cmd.optsWithGlobals().json as boolean;
      try {
        await apiRequest(`/control-template/${controlId}/policy-templates/${policyId}`, {
          method: 'POST',
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
    .description('Remove the link between a policy template and this control.')
    .action(async (controlId: string, policyId: string, _opts, cmd) => {
      const json = cmd.optsWithGlobals().json as boolean;
      try {
        await apiRequest(`/control-template/${controlId}/policy-templates/${policyId}`, {
          method: 'DELETE',
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
    .description('Link a task template to this control (many-to-many relationship).')
    .action(async (controlId: string, taskId: string, _opts, cmd) => {
      const json = cmd.optsWithGlobals().json as boolean;
      try {
        await apiRequest(`/control-template/${controlId}/task-templates/${taskId}`, {
          method: 'POST',
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
    .description('Remove the link between a task template and this control.')
    .action(async (controlId: string, taskId: string, _opts, cmd) => {
      const json = cmd.optsWithGlobals().json as boolean;
      try {
        await apiRequest(`/control-template/${controlId}/task-templates/${taskId}`, {
          method: 'DELETE',
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
    .description(
      'Add an evidence document type to a control template. This is an atomic operation ' +
        'that appends to the existing list without replacing it. ' +
        'Use "framework documents <id>" to see the current matrix.',
    )
    .action(async (controlId: string, documentType: string, _opts, cmd) => {
      const json = cmd.optsWithGlobals().json as boolean;
      try {
        if (!EVIDENCE_FORM_TYPE_VALUES.includes(documentType as never)) {
          throw new CliError(
            `Invalid document type: "${documentType}". Must be one of: ${EVIDENCE_FORM_TYPE_VALUES.join(', ')}`,
          );
        }
        const current = await apiRequest<ControlTemplate>(`/control-template/${controlId}`, {
          apiUrl: cmd.optsWithGlobals().apiUrl,
        });
        const types = Array.isArray(current.documentTypes) ? current.documentTypes : [];
        if (types.includes(documentType)) {
          outputSuccess(`Document type "${documentType}" already exists on control ${controlId}.`, { json });
          return;
        }
        const data = await apiRequest<ControlTemplate>(`/control-template/${controlId}`, {
          method: 'PATCH',
          body: { documentTypes: [...types, documentType] },
          apiUrl: cmd.optsWithGlobals().apiUrl,
        });
        outputResult(data, { json });
      } catch (error) {
        handleError(error, json);
      }
    });

  ctl
    .command('remove-document-type')
    .argument('<control-id>', 'Control template ID')
    .argument('<document-type>', `Document type to remove (${EVIDENCE_FORM_TYPE_VALUES.join(', ')})`)
    .description(
      'Remove an evidence document type from a control template. This is an atomic ' +
        'operation that removes only the specified type without affecting others.',
    )
    .action(async (controlId: string, documentType: string, _opts, cmd) => {
      const json = cmd.optsWithGlobals().json as boolean;
      try {
        const current = await apiRequest<ControlTemplate>(`/control-template/${controlId}`, {
          apiUrl: cmd.optsWithGlobals().apiUrl,
        });
        const types = Array.isArray(current.documentTypes) ? current.documentTypes : [];
        if (!types.includes(documentType)) {
          outputSuccess(`Document type "${documentType}" not found on control ${controlId}.`, { json });
          return;
        }
        const data = await apiRequest<ControlTemplate>(`/control-template/${controlId}`, {
          method: 'PATCH',
          body: { documentTypes: types.filter((t) => t !== documentType) },
          apiUrl: cmd.optsWithGlobals().apiUrl,
        });
        outputResult(data, { json });
      } catch (error) {
        handleError(error, json);
      }
    });
}
