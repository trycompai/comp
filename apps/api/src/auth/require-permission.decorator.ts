import { SetMetadata } from '@nestjs/common';
import { PERMISSIONS_KEY, RequiredPermission } from './permission.guard';

/**
 * Decorator to require specific permissions on a controller or endpoint.
 * Uses better-auth's hasPermission API under the hood via PermissionGuard.
 *
 * @param resource - The resource being accessed (e.g., 'control', 'policy', 'task')
 * @param actions - The action(s) being performed (e.g., 'read', 'delete', ['create', 'update'])
 *
 * @example
 * // Require single permission
 * @RequirePermission('control', 'delete')
 *
 * @example
 * // Require multiple actions on same resource
 * @RequirePermission('control', ['read', 'update'])
 *
 * @example
 * // Use with guards
 * @UseGuards(HybridAuthGuard, PermissionGuard)
 * @RequirePermission('policy', 'publish')
 * @Post(':id/publish')
 * async publishPolicy(@Param('id') id: string) { ... }
 */
export const RequirePermission = (
  resource: string,
  actions: string | string[],
) =>
  SetMetadata(PERMISSIONS_KEY, [
    { resource, actions: Array.isArray(actions) ? actions : [actions] },
  ] as RequiredPermission[]);

/**
 * Decorator to require multiple permissions on different resources.
 * All specified permissions must be satisfied for access to be granted.
 *
 * @param permissions - Array of permission requirements
 *
 * @example
 * // Require permissions on multiple resources
 * @RequirePermissions([
 *   { resource: 'control', actions: ['read'] },
 *   { resource: 'evidence', actions: ['upload'] },
 * ])
 */
export const RequirePermissions = (permissions: RequiredPermission[]) =>
  SetMetadata(PERMISSIONS_KEY, permissions);

/**
 * Resource types available in the GRC permission system
 */
export type GRCResource =
  | 'organization'
  | 'member'
  | 'invitation'
  | 'control'
  | 'evidence'
  | 'policy'
  | 'risk'
  | 'vendor'
  | 'task'
  | 'framework'
  | 'audit'
  | 'finding'
  | 'questionnaire'
  | 'integration'
  | 'app'
  | 'portal';

/**
 * Action types available for GRC resources
 */
export type GRCAction =
  | 'create'
  | 'read'
  | 'update'
  | 'delete'
  | 'assign'
  | 'export'
  | 'upload'
  | 'publish'
  | 'approve'
  | 'assess'
  | 'complete'
  | 'respond';
