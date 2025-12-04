import type { CheckVariable } from '../../types';
import type { LinearTeam, LinearTeamsResponse } from './types';

export const targetTeamsVariable: CheckVariable = {
  id: 'target_teams',
  label: 'Teams to monitor',
  type: 'multi-select',
  required: false,
  helpText: 'Select specific teams to check (leave empty for all teams)',
  fetchOptions: async (ctx) => {
    const query = `
      query {
        teams {
          nodes {
            id
            name
            key
            private
          }
        }
      }
    `;

    const response = await ctx.graphql<LinearTeamsResponse>(query);
    return response.teams.nodes.map((team: LinearTeam) => ({
      value: team.id,
      label: `${team.name} (${team.key})${team.private ? ' - Private' : ''}`,
    }));
  },
};

