// retrieve-integration-session-token.ts

'use server';

import { getGT } from 'gt-next/server';
import { authActionClient } from '../safe-action';
import { getCreateIntegrationSchema } from '../schema';

export const retrieveIntegrationSessionTokenAction = authActionClient
  .inputSchema(async () => {
    const t = await getGT();
    return getCreateIntegrationSchema(t);
  })
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
