import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { db } from '@trycompai/db';
import { CreateControlDto } from './dto/create-control.dto';

@Injectable()
export class ControlsService {
  async create(organizationId: string, dto: CreateControlDto) {
    const { name, description, policyIds, taskIds, requirementMappings } = dto;

    const control = await db.control.create({
      data: {
        name,
        description,
        organizationId,
        ...(policyIds &&
          policyIds.length > 0 && {
            policies: {
              connect: policyIds.map((id) => ({ id })),
            },
          }),
        ...(taskIds &&
          taskIds.length > 0 && {
            tasks: {
              connect: taskIds.map((id) => ({ id })),
            },
          }),
      },
    });

    if (requirementMappings && requirementMappings.length > 0) {
      await Promise.all(
        requirementMappings.map((mapping) =>
          db.requirementMap.create({
            data: {
              controlId: control.id,
              requirementId: mapping.requirementId,
              frameworkInstanceId: mapping.frameworkInstanceId,
            },
          }),
        ),
      );
    }

    return control;
  }

  async delete(controlId: string, organizationId: string) {
    const control = await db.control.findUnique({
      where: {
        id: controlId,
        organizationId,
      },
    });

    if (!control) {
      throw new NotFoundException('Control not found');
    }

    await db.control.delete({
      where: { id: controlId },
    });

    return { success: true };
  }
}
