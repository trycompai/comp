import { db } from '@db';
import { Novu } from '@novu/api';
import { logger, schedules } from '@trigger.dev/sdk';

export const policySchedule = schedules.task({
  id: 'policy-schedule',
  machine: 'large-1x',
  cron: '0 */12 * * *', // Every 12 hours
  maxDuration: 1000 * 60 * 10, // 10 minutes
  run: async () => {
    const now = new Date();

    const novu = new Novu({
      secretKey: process.env.NOVU_API_KEY,
    });

    // Find all published policies that have a review date and frequency set
    const candidatePolicies = await db.policy.findMany({
      where: {
        status: 'published',
        reviewDate: {
          not: null,
        },
        frequency: {
          not: null,
        },
      },
      include: {
        organization: {
          select: {
            id: true,
            name: true,
            members: {
              where: {
                role: { contains: 'owner' },
              },
              select: {
                user: {
                  select: {
                    id: true,
                    name: true,
                    email: true,
                  },
                },
              },
            },
          },
        },
        assignee: {
          select: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
      },
    });

    // Compute next due date based on frequency and filter to overdue
    const addMonthsToDate = (date: Date, months: number) => {
      const result = new Date(date.getTime());
      const originalDayOfMonth = result.getDate();
      result.setMonth(result.getMonth() + months);
      // Handle month rollover (e.g., Jan 31 + 1 month -> Feb 28/29)
      if (result.getDate() < originalDayOfMonth) {
        result.setDate(0);
      }
      return result;
    };

    const overduePolicies = candidatePolicies.filter((policy) => {
      if (!policy.reviewDate || !policy.frequency) return false;

      let monthsToAdd = 0;
      switch (policy.frequency) {
        case 'monthly':
          monthsToAdd = 1;
          break;
        case 'quarterly':
          monthsToAdd = 3;
          break;
        case 'yearly':
          monthsToAdd = 12;
          break;
        default:
          monthsToAdd = 0;
      }

      if (monthsToAdd === 0) return false;

      const nextDueDate = addMonthsToDate(policy.reviewDate, monthsToAdd);
      return nextDueDate <= now;
    });

    logger.info(`Found ${overduePolicies.length} policies past their computed review deadline`);

    if (overduePolicies.length === 0) {
      return {
        success: true,
        totalPoliciesChecked: 0,
        updatedPolicies: 0,
        message: 'No policies found past their computed review deadline',
      };
    }

    // Update all overdue policies to "needs_review" status
    try {
      const policyIds = overduePolicies.map((policy) => policy.id);

      const updateResult = await db.policy.updateMany({
        where: {
          id: {
            in: policyIds,
          },
        },
        data: {
          status: 'needs_review',
        },
      });

      // Build array of recipients (org owner(s) and policy assignee(s)) for each overdue policy
      const recipientsMap = new Map<
        string,
        {
          email: string;
          userId: string;
          name: string;
          policy: (typeof overduePolicies)[number];
        }
      >();
      const addRecipients = (
        users: Array<{ user: { id: string; email: string; name?: string } }>,
        policy: (typeof overduePolicies)[number],
      ) => {
        for (const entry of users) {
          const user = entry.user;
          if (user && user.email && user.id) {
            const key = `${user.id}-${policy.id}`;
            if (!recipientsMap.has(key)) {
              recipientsMap.set(key, {
                email: user.email,
                userId: user.id,
                name: user.name ?? '',
                policy,
              });
            }
          }
        }
      };

      // trigger notification for each policy
      for (const policy of overduePolicies) {
        // Org owners
        if (policy.organization && Array.isArray(policy.organization.members)) {
          addRecipients(policy.organization.members, policy);
        }
        // Policy assignee
        if (policy.assignee) {
          addRecipients([policy.assignee], policy);
        }
      }

      // Final deduplicated recipients array
      const recipients = Array.from(recipientsMap.values());
      novu.triggerBulk({
        events: recipients.map((recipient) => ({
          workflowId: 'policy-review-required',
          to: {
            subscriberId: `${recipient.userId}-${recipient.policy.organizationId}`,
            email: recipient.email,
          },
          payload: {
            email: recipient.email,
            userName: recipient.name,
            policyName: recipient.policy.name,
            organizationName: recipient.policy.organization.name,
            organizationId: recipient.policy.organizationId,
            policyId: recipient.policy.id,
            policyUrl: `${process.env.NEXT_PUBLIC_APP_URL ?? 'https://app.trycomp.ai'}/${recipient.policy.organizationId}/policies/${recipient.policy.id}`,
          },
        })),
      });

      // Log details about updated policies
      overduePolicies.forEach((policy) => {
        logger.info(
          `Updated policy "${policy.name}" (${policy.id}) from org "${policy.organization.name}" - frequency ${policy.frequency} - last reviewed ${policy.reviewDate?.toISOString()}`,
        );
      });

      logger.info(`Successfully updated ${updateResult.count} policies to "needs_review" status`);

      return {
        success: true,
        totalPoliciesChecked: overduePolicies.length,
        updatedPolicies: updateResult.count,
        updatedPolicyIds: policyIds,
        message: `Updated ${updateResult.count} policies past their review deadline`,
      };
    } catch (error) {
      logger.error(`Failed to update overdue policies: ${error}`);

      return {
        success: false,
        totalPoliciesChecked: overduePolicies.length,
        updatedPolicies: 0,
        error: error instanceof Error ? error.message : String(error),
        message: 'Failed to update policies past their review deadline',
      };
    }
  },
});
