import { TASK_TEMPLATES } from '../../../task-mappings';
import type { IntegrationCheck } from '../../../types';
import type { LinearTeamsResponse } from '../types';
import { targetTeamsVariable } from '../variables';

export const privateTeamsCheck: IntegrationCheck = {
  id: 'linear_private_teams',
  name: 'Private Team Configuration',
  description: 'Review team privacy settings to ensure sensitive projects are protected',
  taskMapping: TASK_TEMPLATES.rolebasedAccessControls,
  defaultSeverity: 'low',
  variables: [targetTeamsVariable],

  run: async (ctx) => {
    const targetTeams = ctx.variables.target_teams as string[] | undefined;

    const query = `
      query {
        teams {
          nodes {
            id
            name
            key
            private
            description
          }
        }
      }
    `;

    const response = await ctx.graphql<LinearTeamsResponse>(query);
    let teams = response.teams.nodes;

    if (targetTeams?.length) {
      teams = teams.filter((t) => targetTeams.includes(t.id));
    }

    ctx.log(`Checking ${teams.length} teams`);

    const privateTeams = teams.filter((t) => t.private);
    const publicTeams = teams.filter((t) => !t.private);

    // Report summary
    ctx.pass({
      title: `Team privacy review: ${privateTeams.length} private, ${publicTeams.length} public`,
      description: 'Summary of team privacy configuration.',
      resourceType: 'organization',
      resourceId: 'team-summary',
      evidence: {
        totalTeams: teams.length,
        privateCount: privateTeams.length,
        publicCount: publicTeams.length,
        privateTeams: privateTeams.map((t) => t.name),
        publicTeams: publicTeams.map((t) => t.name),
      },
    });

    // Report each team
    for (const team of teams) {
      if (team.private) {
        ctx.pass({
          title: `${team.name} is private`,
          description: `Team ${team.key} is configured as private.`,
          resourceType: 'team',
          resourceId: team.id,
          evidence: { name: team.name, key: team.key, private: team.private },
        });
      } else {
        ctx.pass({
          title: `${team.name} is public`,
          description: `Team ${team.key} is visible to all organization members.`,
          resourceType: 'team',
          resourceId: team.id,
          evidence: { name: team.name, key: team.key, private: team.private },
        });
      }
    }
  },
};
