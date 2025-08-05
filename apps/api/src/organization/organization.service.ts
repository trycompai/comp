import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { db } from '@trycompai/db';

@Injectable()
export class OrganizationService {
  private readonly logger = new Logger(OrganizationService.name);

  async findById(id: string) {
    try {
      const organization = await db.organization.findUnique({
        where: { id },
        select: {
          id: true,
          name: true,
          slug: true,
          createdAt: true,
        },
      });

      if (!organization) {
        throw new NotFoundException(`Organization with ID ${id} not found`);
      }

      this.logger.log(`Retrieved organization: ${organization.name} (${id})`);
      return organization;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(`Failed to retrieve organization ${id}:`, error);
      throw error;
    }
  }
}
