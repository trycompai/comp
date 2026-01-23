import { Injectable, Logger } from '@nestjs/common';
import { db } from '@db';
import { TrainingEmailService } from './training-email.service';

// Training video IDs - these must match what's in training-videos.ts
const TRAINING_VIDEO_IDS = ['sat-1', 'sat-2', 'sat-3', 'sat-4', 'sat-5'];

@Injectable()
export class TrainingService {
  private readonly logger = new Logger(TrainingService.name);

  constructor(private readonly trainingEmailService: TrainingEmailService) {}

  /**
   * Check if a member has completed all training videos
   */
  async hasCompletedAllTraining(memberId: string): Promise<boolean> {
    const completions = await db.employeeTrainingVideoCompletion.findMany({
      where: {
        memberId,
        videoId: { in: TRAINING_VIDEO_IDS },
        completedAt: { not: null },
      },
    });

    return completions.length === TRAINING_VIDEO_IDS.length;
  }

  /**
   * Get the completion date for training (the most recent video completion)
   */
  async getTrainingCompletionDate(memberId: string): Promise<Date | null> {
    const completions = await db.employeeTrainingVideoCompletion.findMany({
      where: {
        memberId,
        videoId: { in: TRAINING_VIDEO_IDS },
        completedAt: { not: null },
      },
      orderBy: { completedAt: 'desc' },
      take: 1,
    });

    if (completions.length === 0 || !completions[0].completedAt) {
      return null;
    }

    return completions[0].completedAt;
  }

  /**
   * Send training completion email with certificate if all training is complete
   * Returns true if email was sent, false if training is not complete
   */
  async sendTrainingCompletionEmailIfComplete(
    memberId: string,
    organizationId: string,
  ): Promise<{ sent: boolean; reason?: string }> {
    // Check if all training is complete
    const isComplete = await this.hasCompletedAllTraining(memberId);
    if (!isComplete) {
      return { sent: false, reason: 'training_not_complete' };
    }

    // Get member details
    const member = await db.member.findUnique({
      where: { id: memberId },
      include: {
        user: {
          select: {
            email: true,
            name: true,
          },
        },
        organization: {
          select: {
            name: true,
          },
        },
      },
    });

    if (!member || !member.user) {
      this.logger.warn(`Member not found or no user: ${memberId}`);
      return { sent: false, reason: 'member_not_found' };
    }

    if (!member.user.email) {
      this.logger.warn(`Member has no email: ${memberId}`);
      return { sent: false, reason: 'no_email' };
    }

    // Check if member's organization matches
    if (member.organizationId !== organizationId) {
      this.logger.warn(
        `Member organization mismatch: ${member.organizationId} !== ${organizationId}`,
      );
      return { sent: false, reason: 'organization_mismatch' };
    }

    // Get completion date
    const completedAt = await this.getTrainingCompletionDate(memberId);
    if (!completedAt) {
      return { sent: false, reason: 'no_completion_date' };
    }

    // Send the email with certificate
    try {
      await this.trainingEmailService.sendTrainingCompletedEmail({
        toEmail: member.user.email,
        toName: member.user.name || 'Team Member',
        organizationName: member.organization?.name || 'Your Organization',
        completedAt,
      });

      this.logger.log(
        `Training completion email sent to ${member.user.email} for member ${memberId}`,
      );

      return { sent: true };
    } catch (error) {
      this.logger.error(
        `Failed to send training completion email to ${member.user.email}:`,
        error,
      );
      throw error;
    }
  }
}
