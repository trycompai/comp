import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { db } from '@db';
import { TrainingEmailService } from './training-email.service';
import { TrainingCertificatePdfService } from './training-certificate-pdf.service';

const GENERAL_TRAINING_IDS = ['sat-1', 'sat-2', 'sat-3', 'sat-4', 'sat-5'];
const HIPAA_TRAINING_ID = 'hipaa-sat-1';
const ALL_TRAINING_IDS = [...GENERAL_TRAINING_IDS, HIPAA_TRAINING_ID];

@Injectable()
export class TrainingService {
  private readonly logger = new Logger(TrainingService.name);

  constructor(
    private readonly trainingEmailService: TrainingEmailService,
    private readonly trainingCertificatePdfService: TrainingCertificatePdfService,
  ) {}

  async getCompletions(memberId: string, organizationId: string) {
    const member = await db.member.findFirst({
      where: { id: memberId, organizationId, deactivated: false },
    });

    if (!member) {
      throw new NotFoundException('Member not found');
    }

    return db.employeeTrainingVideoCompletion.findMany({
      where: { memberId },
    });
  }

  async markVideoComplete(
    memberId: string,
    organizationId: string,
    videoId: string,
  ) {
    if (!ALL_TRAINING_IDS.includes(videoId)) {
      throw new BadRequestException(`Invalid video ID: ${videoId}`);
    }

    if (videoId === HIPAA_TRAINING_ID) {
      const hipaaInstance = await db.frameworkInstance.findFirst({
        where: { organizationId, framework: { name: 'HIPAA' } },
        select: { id: true },
      });
      if (!hipaaInstance) {
        throw new BadRequestException(
          'HIPAA training is not available for this organization',
        );
      }
    }

    const member = await db.member.findFirst({
      where: { id: memberId, organizationId, deactivated: false },
    });

    if (!member) {
      throw new NotFoundException('Member not found');
    }

    let record = await db.employeeTrainingVideoCompletion.findFirst({
      where: { videoId, memberId },
    });

    if (!record) {
      record = await db.employeeTrainingVideoCompletion.create({
        data: {
          videoId,
          memberId,
          completedAt: new Date(),
        },
      });
    } else if (!record.completedAt) {
      record = await db.employeeTrainingVideoCompletion.update({
        where: { id: record.id },
        data: { completedAt: new Date() },
      });
    }

    if (videoId === HIPAA_TRAINING_ID) {
      try {
        await this.sendHipaaCompletionEmailIfComplete(memberId, organizationId);
      } catch (error) {
        this.logger.error(
          `Failed to send HIPAA training completion email for member ${memberId}:`,
          error,
        );
      }
    } else {
      const allComplete = await this.hasCompletedAllTraining(memberId);
      if (allComplete) {
        try {
          await this.sendTrainingCompletionEmailIfComplete(
            memberId,
            organizationId,
          );
        } catch (error) {
          this.logger.error(
            `Failed to send training completion email for member ${memberId}:`,
            error,
          );
        }
      }
    }

    return record;
  }

  async hasCompletedAllTraining(memberId: string): Promise<boolean> {
    const completions = await db.employeeTrainingVideoCompletion.findMany({
      where: {
        memberId,
        videoId: { in: GENERAL_TRAINING_IDS },
        completedAt: { not: null },
      },
    });

    return completions.length === GENERAL_TRAINING_IDS.length;
  }

  async hasCompletedHipaaTraining(memberId: string): Promise<boolean> {
    const completion = await db.employeeTrainingVideoCompletion.findFirst({
      where: {
        memberId,
        videoId: HIPAA_TRAINING_ID,
        completedAt: { not: null },
      },
    });

    return !!completion;
  }

  async getTrainingCompletionDate(memberId: string): Promise<Date | null> {
    const completions = await db.employeeTrainingVideoCompletion.findMany({
      where: {
        memberId,
        videoId: { in: GENERAL_TRAINING_IDS },
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

  async sendTrainingCompletionEmailIfComplete(
    memberId: string,
    organizationId: string,
  ): Promise<{ sent: boolean; reason?: string }> {
    const isComplete = await this.hasCompletedAllTraining(memberId);
    if (!isComplete) {
      return { sent: false, reason: 'training_not_complete' };
    }

    const resolved = await this.resolveMemberForCertificate(
      memberId,
      organizationId,
    );
    if ('reason' in resolved) return { sent: false, reason: resolved.reason };

    const completedAt = await this.getTrainingCompletionDate(memberId);
    if (!completedAt) return { sent: false, reason: 'no_completion_date' };

    await this.trainingEmailService.sendTrainingCompletedEmail({
      toEmail: resolved.email,
      toName: resolved.userName,
      organizationName: resolved.organizationName,
      completedAt,
    });
    this.logger.log(`Training completion email sent to ${resolved.email}`);
    return { sent: true };
  }

  async generateCertificate(
    memberId: string,
    organizationId: string,
  ): Promise<{ pdf: Buffer; fileName: string } | { error: string }> {
    const isComplete = await this.hasCompletedAllTraining(memberId);
    if (!isComplete) return { error: 'training_not_complete' };

    const resolved = await this.resolveMemberForCertificate(
      memberId,
      organizationId,
    );
    if ('reason' in resolved) return { error: resolved.reason };

    const completedAt = await this.getTrainingCompletionDate(memberId);
    if (!completedAt) return { error: 'no_completion_date' };

    const pdf =
      await this.trainingCertificatePdfService.generateTrainingCertificatePdf({
        userName: resolved.userName,
        organizationName: resolved.organizationName,
        completedAt,
      });

    return {
      pdf,
      fileName: `training-certificate-${resolved.userName.replace(/\s+/g, '-').toLowerCase()}.pdf`,
    };
  }

  async getHipaaCompletionDate(memberId: string): Promise<Date | null> {
    const completion = await db.employeeTrainingVideoCompletion.findFirst({
      where: {
        memberId,
        videoId: HIPAA_TRAINING_ID,
        completedAt: { not: null },
      },
    });
    return completion?.completedAt ?? null;
  }

  async sendHipaaCompletionEmailIfComplete(
    memberId: string,
    organizationId: string,
  ): Promise<{ sent: boolean; reason?: string }> {
    const isComplete = await this.hasCompletedHipaaTraining(memberId);
    if (!isComplete)
      return { sent: false, reason: 'hipaa_training_not_complete' };

    const resolved = await this.resolveMemberForCertificate(
      memberId,
      organizationId,
    );
    if ('reason' in resolved) return { sent: false, reason: resolved.reason };

    const completedAt = await this.getHipaaCompletionDate(memberId);
    if (!completedAt) return { sent: false, reason: 'no_completion_date' };

    await this.trainingEmailService.sendHipaaTrainingCompletedEmail({
      toEmail: resolved.email,
      toName: resolved.userName,
      organizationName: resolved.organizationName,
      completedAt,
    });
    this.logger.log(
      `HIPAA training completion email sent to ${resolved.email}`,
    );
    return { sent: true };
  }

  async generateHipaaCertificate(
    memberId: string,
    organizationId: string,
  ): Promise<{ pdf: Buffer; fileName: string } | { error: string }> {
    const isComplete = await this.hasCompletedHipaaTraining(memberId);
    if (!isComplete) return { error: 'hipaa_training_not_complete' };

    const resolved = await this.resolveMemberForCertificate(
      memberId,
      organizationId,
    );
    if ('reason' in resolved) return { error: resolved.reason };

    const completedAt = await this.getHipaaCompletionDate(memberId);
    if (!completedAt) return { error: 'no_completion_date' };

    const pdf =
      await this.trainingCertificatePdfService.generateHipaaCertificatePdf({
        userName: resolved.userName,
        organizationName: resolved.organizationName,
        completedAt,
      });

    return {
      pdf,
      fileName: `hipaa-training-certificate-${resolved.userName.replace(/\s+/g, '-').toLowerCase()}.pdf`,
    };
  }

  private async resolveMemberForCertificate(
    memberId: string,
    organizationId: string,
  ): Promise<
    | { userName: string; email: string; organizationName: string }
    | { reason: string }
  > {
    const member = await db.member.findUnique({
      where: { id: memberId },
      include: {
        user: { select: { email: true, name: true } },
        organization: { select: { name: true } },
      },
    });

    if (!member?.user) return { reason: 'member_not_found' };
    if (!member.user.email) return { reason: 'no_email' };
    if (member.organizationId !== organizationId)
      return { reason: 'organization_mismatch' };

    return {
      userName: member.user.name || 'Team Member',
      email: member.user.email,
      organizationName: member.organization?.name || 'Organization',
    };
  }
}
