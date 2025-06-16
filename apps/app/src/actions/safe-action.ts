import { track } from "@/app/posthog";
import { env } from "@/env.mjs";
import { auth } from "@/utils/auth";
import { logger } from "@/utils/logger";
import { db } from "@comp/db";
import { AuditLogEntityType } from "@comp/db/types";
import { client } from "@comp/kv";
import { Ratelimit } from "@upstash/ratelimit";
import {
  DEFAULT_SERVER_ERROR_MESSAGE,
  createSafeActionClient,
} from "next-safe-action";
import { headers } from "next/headers";
import { z } from "zod";

let ratelimit: Ratelimit | undefined;

if (env.UPSTASH_REDIS_REST_URL && env.UPSTASH_REDIS_REST_TOKEN) {
  ratelimit = new Ratelimit({
    limiter: Ratelimit.fixedWindow(10, "10s"),
    redis: client,
  });
}

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
          description: z.string().optional(),
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
    let remaining: number | undefined;

    if (ratelimit) {
      const { success, remaining } = await ratelimit.limit(
        `${headersList.get("x-forwarded-for")}-${metadata.name}`,
      );

      if (!success) {
        throw new Error("Too many requests");
      }
    }

    return next({
      ctx: {
        ip: headersList.get("x-forwarded-for"),
        userAgent: headersList.get("user-agent"),
        ratelimit: {
          remaining: remaining ?? 0,
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
  })
  .use(async ({ next, metadata, clientInput }) => {
    const headersList = await headers();
    const session = await auth.api.getSession({
      headers: headersList,
    });

    const member = await auth.api.getActiveMember({
      headers: headersList,
    });

    if (!session) {
      throw new Error("Unauthorized");
    }

    if (!session.session.activeOrganizationId) {
      throw new Error("Organization not found");
    }

    if (!member) {
      throw new Error("Member not found");
    }

    const data = {
      userId: session.user.id,
      email: session.user.email,
      name: session.user.name,
      organizationId: session.session.activeOrganizationId,
      action: metadata.name,
      input: clientInput,
      ipAddress: headersList.get("x-forwarded-for") || null,
      userAgent: headersList.get("user-agent") || null,
    };

    const entityId = (clientInput as { entityId: string })?.entityId || null;

    let entityType = null;

    const mapEntityType: Record<string, AuditLogEntityType> = {
      pol_: AuditLogEntityType.policy,
      ctl_: AuditLogEntityType.control,
      tsk_: AuditLogEntityType.task,
      vnd_: AuditLogEntityType.vendor,
      rsk_: AuditLogEntityType.risk,
      org_: AuditLogEntityType.organization,
      frm_: AuditLogEntityType.framework,
      req_: AuditLogEntityType.requirement,
      mem_: AuditLogEntityType.people,
      itr_: AuditLogEntityType.tests,
      int_: AuditLogEntityType.integration,
      frk_rq_: AuditLogEntityType.framework,
      frk_ctrl_: AuditLogEntityType.framework,
      frk_req_: AuditLogEntityType.framework,
    };

    if (entityId) {
      const parts = entityId.split("_");
      const prefix = `${parts[0]}_`;

      // Handle special case prefixes with multiple parts
      if (parts.length > 2) {
        const complexPrefix = `${prefix}${parts[1]}_`;
        entityType =
          mapEntityType[complexPrefix] || mapEntityType[prefix] || null;
      } else {
        entityType = mapEntityType[prefix] || null;
      }
    }

    try {
      await db.auditLog.create({
        data: {
          data: JSON.stringify(data),
          memberId: member.id,
          userId: session.user.id,
          description: metadata.track?.description || null,
          organizationId: session.session.activeOrganizationId,
          entityId,
          entityType,
        },
      });
    } catch (error) {
      logger("Audit log error:", error);
    }

    return next();
  });
