import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { db } from '@trycompai/db';

@Injectable()
export class FrameworksService {
  async delete(frameworkInstanceId: string, organizationId: string) {
    const frameworkInstance = await db.frameworkInstance.findUnique({
      where: {
        id: frameworkInstanceId,
        organizationId,
      },
    });

    if (!frameworkInstance) {
      throw new NotFoundException('Framework instance not found');
    }

    await db.frameworkInstance.delete({
      where: { id: frameworkInstanceId },
    });

    return { success: true };
  }
}
