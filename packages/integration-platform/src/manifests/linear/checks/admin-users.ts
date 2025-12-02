import { TASK_TEMPLATES } from '../../../task-mappings';
import type { IntegrationCheck } from '../../../types';
import type { LinearUsersResponse } from '../types';

export const adminUsersCheck: IntegrationCheck = {
  id: 'linear_admin_users',
  name: 'Admin User Review',
  description: 'Review and verify admin users in the Linear organization',
  taskMapping: TASK_TEMPLATES.accessReviewLog,
  defaultSeverity: 'medium',
  variables: [],

  run: async (ctx) => {
    const query = `
      query {
        users {
          nodes {
            id
            name
            email
            admin
            active
            createdAt
          }
        }
      }
    `;

    const response = await ctx.graphql<LinearUsersResponse>(query);
    const users = response.users.nodes;

    const activeAdmins = users.filter((u) => u.admin && u.active);
    const totalActive = users.filter((u) => u.active).length;

    // Pass if there are admins (we're just documenting them for review)
    if (activeAdmins.length > 0) {
      ctx.pass({
        title: `${activeAdmins.length} admin user(s) found`,
        description: `Organization has ${activeAdmins.length} admin(s) out of ${totalActive} active users.`,
        resourceType: 'organization',
        resourceId: 'admin-review',
        evidence: {
          totalActiveUsers: totalActive,
          adminCount: activeAdmins.length,
          admins: activeAdmins.map((a) => ({
            name: a.name,
            email: a.email,
            createdAt: a.createdAt,
          })),
        },
      });
    }

    // Also report each admin individually for detailed audit
    for (const admin of activeAdmins) {
      ctx.pass({
        title: `Admin: ${admin.name}`,
        description: `${admin.email} has admin privileges.`,
        resourceType: 'user',
        resourceId: admin.id,
        evidence: {
          name: admin.name,
          email: admin.email,
          admin: admin.admin,
          active: admin.active,
          createdAt: admin.createdAt,
        },
      });
    }
  },
};

