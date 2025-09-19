import { db } from '@db';
import { sendPolicyReviewNotificationEmail } from '@trycompai/email';
import { logger, schedules } from '@trigger.dev/sdk';

export const policySchedule = schedules.task({
  id: 'policy-schedule',
  cron: '0 */12 * * *', // Every 12 hours
  maxDuration: 1000 * 60 * 10, // 10 minutes
  run: async () => {
    const now = new Date();

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
            name: true,
          },
        },
        assignee: {
          include: {
            user: true,
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

      // Log details about updated policies
      overduePolicies.forEach((policy) => {
        logger.info(
          `Updated policy "${policy.name}" (${policy.id}) from org "${policy.organization.name}" - frequency ${policy.frequency} - last reviewed ${policy.reviewDate?.toISOString()}`,
        );
      });

      logger.info(`Successfully updated ${updateResult.count} policies to "needs_review" status`);

      // Build a map of owners by organization for targeted notifications
      const uniqueOrgIds = Array.from(new Set(overduePolicies.map((p) => p.organizationId)));
      const owners = await db.member.findMany({
        where: {
          organizationId: { in: uniqueOrgIds },
          isActive: true,
          // role is a comma-separated string sometimes
          role: { contains: 'owner' },
        },
        include: {
          user: true,
        },
      });

      const ownersByOrgId = new Map<string, { email: string; name: string }[]>();
      owners.forEach((owner) => {
        const email = owner.user?.email;
        if (!email) return;
        const list = ownersByOrgId.get(owner.organizationId) ?? [];
        list.push({ email, name: owner.user.name ?? email });
        ownersByOrgId.set(owner.organizationId, list);
      });

      // Send review notifications to org owners and the policy assignee only
      // Send review notifications to org owners and the policy assignee only, rate-limited to 2 emails/sec
      const EMAIL_BATCH_SIZE = 2;
      const EMAIL_BATCH_DELAY_MS = 1000;

      // Build a flat list of all emails to send, with their policy context
      type EmailJob = {
        email: string;
        name: string;
        policy: typeof overduePolicies[number];
      };
      const emailJobs: EmailJob[] = [];

      for (const policy of overduePolicies) {
        const recipients = new Map<string, string>(); // email -> name

        // Assignee (if any)
        const assigneeEmail = policy.assignee?.user?.email;
        if (assigneeEmail) {
          recipients.set(assigneeEmail, policy.assignee?.user?.name ?? assigneeEmail);
        }

        // Organization owners
        const orgOwners = ownersByOrgId.get(policy.organizationId) ?? [];
        orgOwners.forEach((o) => recipients.set(o.email, o.name));

        if (recipients.size === 0) {
          logger.info(`No recipients found for policy ${policy.id} (${policy.name})`);
          continue;
        }

        for (const [email, name] of recipients.entries()) {
          emailJobs.push({ email, name, policy });
        }
      }

      // Send emails in batches of EMAIL_BATCH_SIZE per second
      for (let i = 0; i < emailJobs.length; i += EMAIL_BATCH_SIZE) {
        const batch = emailJobs.slice(i, i + EMAIL_BATCH_SIZE);

        await Promise.all(
          batch.map(async ({ email, name, policy }) => {
            try {
              await sendPolicyReviewNotificationEmail({
                email,
                userName: name,
                policyName: policy.name,
                organizationName: policy.organization.name,
                organizationId: policy.organizationId,
                policyId: policy.id,
              });
              logger.info(`Sent policy review notification to ${email} for policy ${policy.id}`);
            } catch (emailError) {
              logger.error(`Failed to send review email to ${email} for policy ${policy.id}: ${emailError}`);
            }
          }),
        );

        // Only delay if there are more emails to send
        if (i + EMAIL_BATCH_SIZE < emailJobs.length) {
          await new Promise((resolve) => setTimeout(resolve, EMAIL_BATCH_DELAY_MS));
        }
      }

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
