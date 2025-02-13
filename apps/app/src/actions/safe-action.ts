import { auth } from "@/auth";
import { logger } from "@/utils/logger";
import * as ServerAnalytics from "@bubba/analytics/src/server";
import { db } from "@bubba/db";
import { client } from "@bubba/kv";
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
    const session = await auth();

    if (!session) {
      throw new Error("Unauthorized");
    }

    const result = await next({ ctx: {} });

    if (process.env.NODE_ENV === "development") {
      logger("Input ->", clientInput as string);
      logger("Result ->", result.data as string);

      return result;
    }

    return result;
  })
  .use(async ({ next, metadata }) => {
    const headersList = await headers();
    const ip = headersList.get("x-forwarded-for");

    const { success, remaining } = await ratelimit.limit(
      `${ip}-${metadata.name}`,
    );

    if (!success) {
      throw new Error("Too many requests");
    }

    return next({
      ctx: {
        ratelimit: {
          remaining,
        },
      },
    });
  })
  .use(async ({ next, metadata }) => {
    const headersList = await headers();
    const session = await auth();

    if (!session) {
      throw new Error("Unauthorized");
    }

    /*     if (
          metadata.name !== "check-subdomain-availability" &&
          metadata.name !== "create-organization"
        ) {
          if (!session.user.organizationId) {
            throw new Error("Organization not found");
          }

          const auditData = {
            userId: session.user.id,
            email: session.user.email,
            name: session.user.name,
            organizationId: session.user.organizationId,
            action: metadata.name,
            ipAddress: headersList.get("x-forwarded-for") || null,
            userAgent: headersList.get("user-agent") || null,
          };

          try {
            await db.auditLog.create({
              data: {
                data: auditData,
                userId: session.user.id,
                organizationId: session.user.organizationId,
              },
            });

            if (metadata.track) {
              await ServerAnalytics.track(
                session.user.id,
                metadata.track.event,
                {
                  channel: metadata.track.channel,
                  email: session.user.email,
                  name: session.user.name,
                  organizationId: session.user.organizationId,
                }
              );
            }
          } catch (error) {
            logger("Audit log error:", error);
          }
        } */

    return next({
      ctx: {
        user: session.user,
      },
    });
  });
