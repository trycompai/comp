import { Injectable, NotFoundException } from '@nestjs/common';
import { db } from '@trycompai/db';

interface BaseParams {
  organizationId: string;
  userId: string;
}

interface CompleteTrainingVideoParams extends BaseParams {
  videoId: string;
}

@Injectable()
export class PeopleMeService {
  async getMe({ organizationId, userId }: BaseParams) {
    const member = await db.member.findFirst({
      where: { userId, organizationId, deactivated: false },
      include: { user: true, organization: true },
    });

    if (!member) {
      throw new NotFoundException('Member not found in this organization');
    }

    return member;
  }

  async getTrainingVideos({ organizationId, userId }: BaseParams) {
    const member = await db.member.findFirst({
      where: { userId, organizationId, deactivated: false },
      select: { id: true },
    });

    if (!member) {
      throw new NotFoundException('Member not found in this organization');
    }

    return db.employeeTrainingVideoCompletion.findMany({
      where: { memberId: member.id },
    });
  }

  async completeTrainingVideo({
    organizationId,
    userId,
    videoId,
  }: CompleteTrainingVideoParams) {
    const member = await db.member.findFirst({
      where: { userId, organizationId, deactivated: false },
      select: { id: true },
    });

    if (!member) {
      throw new NotFoundException('Member not found in this organization');
    }

    const existing = await db.employeeTrainingVideoCompletion.findFirst({
      where: { memberId: member.id, videoId },
    });

    if (!existing) {
      const created = await db.employeeTrainingVideoCompletion.create({
        data: { memberId: member.id, videoId, completedAt: new Date() },
      });
      return { success: true, data: created };
    }

    if (existing.completedAt) {
      return { success: true, data: existing };
    }

    const updated = await db.employeeTrainingVideoCompletion.update({
      where: { id: existing.id },
      data: { completedAt: new Date() },
    });

    return { success: true, data: updated };
  }
}
