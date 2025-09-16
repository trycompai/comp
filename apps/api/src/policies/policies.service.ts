import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { db } from '@trycompai/db';
import type { Prisma } from '@trycompai/db';
import type { CreatePolicyDto } from './dto/create-policy.dto';
import type { UpdatePolicyDto } from './dto/update-policy.dto';

@Injectable()
export class PoliciesService {
  private readonly logger = new Logger(PoliciesService.name);

  async findAll(organizationId: string) {
    try {
      const policies = await db.policy.findMany({
        where: { organizationId },
        select: {
          id: true,
          name: true,
          description: true,
          status: true,
          content: true,
          frequency: true,
          department: true,
          isRequiredToSign: true,
          signedBy: true,
          reviewDate: true,
          isArchived: true,
          createdAt: true,
          updatedAt: true,
          lastArchivedAt: true,
          lastPublishedAt: true,
          organizationId: true,
          assigneeId: true,
          approverId: true,
          policyTemplateId: true,
        },
        orderBy: { createdAt: 'desc' },
      });

      this.logger.log(
        `Retrieved ${policies.length} policies for organization ${organizationId}`,
      );
      return policies;
    } catch (error) {
      this.logger.error(
        `Failed to retrieve policies for organization ${organizationId}:`,
        error,
      );
      throw error;
    }
  }

  async findById(id: string, organizationId: string) {
    try {
      const policy = await db.policy.findFirst({
        where: {
          id,
          organizationId,
        },
        select: {
          id: true,
          name: true,
          description: true,
          status: true,
          content: true,
          frequency: true,
          department: true,
          isRequiredToSign: true,
          signedBy: true,
          reviewDate: true,
          isArchived: true,
          createdAt: true,
          updatedAt: true,
          lastArchivedAt: true,
          lastPublishedAt: true,
          organizationId: true,
          assigneeId: true,
          approverId: true,
          policyTemplateId: true,
        },
      });

      if (!policy) {
        throw new NotFoundException(`Policy with ID ${id} not found`);
      }

      this.logger.log(`Retrieved policy: ${policy.name} (${id})`);
      return policy;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(`Failed to retrieve policy ${id}:`, error);
      throw error;
    }
  }

  async create(organizationId: string, createData: CreatePolicyDto) {
    try {
      const policy = await db.policy.create({
        data: {
          ...createData,
          // Ensure JSON[] type compatibility for Prisma
          content: createData.content as Prisma.InputJsonValue[],
          organizationId,
          status: createData.status || 'draft',
          isRequiredToSign: createData.isRequiredToSign ?? true,
        },
        select: {
          id: true,
          name: true,
          description: true,
          status: true,
          content: true,
          frequency: true,
          department: true,
          isRequiredToSign: true,
          signedBy: true,
          reviewDate: true,
          isArchived: true,
          createdAt: true,
          updatedAt: true,
          lastArchivedAt: true,
          lastPublishedAt: true,
          organizationId: true,
          assigneeId: true,
          approverId: true,
          policyTemplateId: true,
        },
      });

      this.logger.log(`Created policy: ${policy.name} (${policy.id})`);
      return policy;
    } catch (error) {
      this.logger.error(
        `Failed to create policy for organization ${organizationId}:`,
        error,
      );
      throw error;
    }
  }

  async updateById(
    id: string,
    organizationId: string,
    updateData: UpdatePolicyDto,
  ) {
    try {
      // First check if the policy exists and belongs to the organization
      const existingPolicy = await db.policy.findFirst({
        where: {
          id,
          organizationId,
        },
        select: { id: true, name: true },
      });

      if (!existingPolicy) {
        throw new NotFoundException(`Policy with ID ${id} not found`);
      }

      // Prepare update data with special handling for status changes
      const updatePayload: Record<string, unknown> = { ...updateData };

      // If status is being changed to published, update lastPublishedAt
      if (updateData.status === 'published') {
        updatePayload.lastPublishedAt = new Date();
      }

      // If isArchived is being set to true, update lastArchivedAt
      if (updateData.isArchived === true) {
        updatePayload.lastArchivedAt = new Date();
      }

      // Coerce content to Prisma JSON[] input if provided
      if (Array.isArray(updateData.content)) {
        updatePayload.content = updateData.content as Prisma.InputJsonValue[];
      }

      // Update the policy
      const updatedPolicy = await db.policy.update({
        where: { id },
        data: updatePayload,
        select: {
          id: true,
          name: true,
          description: true,
          status: true,
          content: true,
          frequency: true,
          department: true,
          isRequiredToSign: true,
          signedBy: true,
          reviewDate: true,
          isArchived: true,
          createdAt: true,
          updatedAt: true,
          lastArchivedAt: true,
          lastPublishedAt: true,
          organizationId: true,
          assigneeId: true,
          approverId: true,
          policyTemplateId: true,
        },
      });

      this.logger.log(`Updated policy: ${updatedPolicy.name} (${id})`);
      return updatedPolicy;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(`Failed to update policy ${id}:`, error);
      throw error;
    }
  }

  async deleteById(id: string, organizationId: string) {
    try {
      // First check if the policy exists and belongs to the organization
      const policy = await db.policy.findFirst({
        where: {
          id,
          organizationId,
        },
        select: {
          id: true,
          name: true,
        },
      });

      if (!policy) {
        throw new NotFoundException(`Policy with ID ${id} not found`);
      }

      // Delete the policy
      await db.policy.delete({
        where: { id },
      });

      this.logger.log(`Deleted policy: ${policy.name} (${id})`);
      return { success: true, deletedPolicy: policy };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(`Failed to delete policy ${id}:`, error);
      throw error;
    }
  }
}
