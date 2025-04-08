import { track } from "@/app/posthog";
import { auth } from "@/utils/auth";
import { logger } from "@/utils/logger";
import { client } from "@comp/kv";
import { Ratelimit } from "@upstash/ratelimit";
import {
  DEFAULT_SERVER_ERROR_MESSAGE,
  createSafeActionClient,
} from "next-safe-action";
import { headers } from "next/headers";
import { z } from "zod";

const ratelimit = new Ratelimit({
  limiter: Ratelimit.fixedWindow(10, "10s"),
  redis: client,
});

export const actionClientWithMeta = createSafeActionClient({
  handleServerError(e) {
    if (e instanceof Error) {
      return e.message;
    }

    return DEFAULT_SERVER_ERROR_MESSAGE;
  },
  defineMetadataSchema() {
    return z.object({
      name: z.string(),
      ip: z.string().optional(),
      userAgent: z.string().optional(),
      track: z
        .object({
          event: z.string(),
          channel: z.string(),
        })
        .optional(),
    });
  },
});

export const authActionClient = actionClientWithMeta
  .use(async ({ next, clientInput }) => {
    const response = await auth.api.getSession({
      headers: await headers(),
    });

    const { session, user } = response ?? {};

    if (!session) {
      throw new Error("Unauthorized");
    }

    const result = await next({
      ctx: {
        user: user,
        session: session,
      },
    });

    if (process.env.NODE_ENV === "development") {
      logger("Input ->", clientInput as string);
      logger("Result ->", result.data as string);

      return result;
    }

    return result;
  })
  .use(async ({ next, metadata }) => {
    const headersList = await headers();

    const { success, remaining } = await ratelimit.limit(
      `${headersList.get("x-forwarded-for")}-${metadata.name}`
    );

    if (!success) {
      throw new Error("Too many requests");
    }

    return next({
      ctx: {
        ip: headersList.get("x-forwarded-for"),
        userAgent: headersList.get("user-agent"),
        ratelimit: {
          remaining,
        },
      },
    });
  })
  .use(async ({ next, metadata, ctx }) => {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session) {
      throw new Error("Unauthorized");
    }

    if (metadata.track) {
      track(session.user.id, metadata.track.event, {
        channel: metadata.track.channel,
        email: session.user.email,
        name: session.user.name,
        organizationId: session.session.activeOrganizationId,
      });
    }

    return next({
      ctx: {
        user: session.user,
      },
    });
  });
