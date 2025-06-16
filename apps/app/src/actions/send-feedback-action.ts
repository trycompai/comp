"use server";

import { env } from "@/env.mjs";
import axios from "axios";
import { authActionClient } from "./safe-action";
import { sendFeedbackSchema } from "./schema";

export const sendFeebackAction = authActionClient
  .schema(sendFeedbackSchema)
  .metadata({
    name: "send-feedback",
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
