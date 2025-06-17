// retrieve-integration-session-token.ts

'use server';

import { authActionClient } from '../safe-action';
import { createIntegrationSchema } from '../schema';

export const retrieveIntegrationSessionTokenAction = authActionClient
  .inputSchema(createIntegrationSchema)
  .metadata({
    name: 'retrieve-integration-session-token',
    track: {
      event: 'retrieve-integration-session-token',
      channel: 'server',
    },
  })
  .action(async ({ parsedInput, ctx }) => {
    const { integrationId } = parsedInput;
    const { user } = ctx;

    return {
      success: true,
      sessionToken: '123',
    };
  });
