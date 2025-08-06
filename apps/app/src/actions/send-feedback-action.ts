'use server';

import { env } from '@/env.mjs';
import axios from 'axios';
import { authActionClient } from './safe-action';
import { getSendFeedbackSchema } from './schema';
import { getGT } from 'gt-next/server';

export const sendFeebackAction = authActionClient
  .inputSchema(async () => {
    const t = await getGT();
    return getSendFeedbackSchema(t);
  })
  .metadata({
    name: 'send-feedback',
  })
  .action(async ({ parsedInput: { feedback }, ctx: { user } }) => {
    if (env.DISCORD_WEBHOOK_URL) {
      await axios.post(process.env.DISCORD_WEBHOOK_URL as string, {
        content: `New feedback from ${user?.email}: \n\n ${feedback}`,
      });
    }

    return {
      success: true,
    };
  });
