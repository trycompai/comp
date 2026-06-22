import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { db, FrameworkEditorFrameworkFamilyStatus } from '@db';
import { CreateFrameworkFamilyDto } from './dto/create-framework-family.dto';
import { UpdateFrameworkFamilyDto } from './dto/update-framework-family.dto';

@Injectable()
export class FrameworkFamilyService {
  private readonly logger = new Logger(FrameworkFamilyService.name);

  /** List families alphabetically with the number of frameworks in each. */
  async findAll() {
    const families = await db.frameworkEditorFrameworkFamily.findMany({
      orderBy: { name: 'asc' },
      include: { _count: { select: { frameworks: true } } },
    });
    return families.map((family) => ({
      ...family,
      frameworksCount: family._count.frameworks,
      _count: undefined,
    }));
  }

  async create(dto: CreateFrameworkFamilyDto) {
    const family = await db.frameworkEditorFrameworkFamily.create({
      data: {
        name: dto.name,
        description: dto.description ?? '',
        status: dto.status ?? FrameworkEditorFrameworkFamilyStatus.hidden,
      },
    });
    this.logger.log(`Created framework family: ${family.name} (${family.id})`);
    return family;
  }

  async update(id: string, dto: UpdateFrameworkFamilyDto) {
    await this.getOrThrow(id);
    const updated = await db.frameworkEditorFrameworkFamily.update({
      where: { id },
      data: {
        // `!= null` (not `!== undefined`) so an explicit null is ignored rather
        // than written to these non-nullable columns (which would 500).
        ...(dto.name != null && { name: dto.name }),
        ...(dto.description != null && { description: dto.description }),
        ...(dto.status != null && { status: dto.status }),
      },
    });
    this.logger.log(`Updated framework family: ${updated.name} (${id})`);
    return updated;
  }

  /** Delete a family — only allowed once it contains no frameworks. */
  async delete(id: string) {
    const family = await this.getOrThrow(id);
    if (family._count.frameworks > 0) {
      throw new BadRequestException(
        `Cannot delete "${family.name}": move or remove its ${family._count.frameworks} framework(s) first.`,
      );
    }
    await db.frameworkEditorFrameworkFamily.delete({ where: { id } });
    this.logger.log(`Deleted framework family ${id}`);
    return { message: 'Framework family deleted successfully' };
  }

  /**
   * Move frameworks into a family, or to the root when familyId is null.
   * Validates the destination family exists before moving.
   */
  async moveFrameworks(frameworkIds: string[], familyId: string | null) {
    if (familyId !== null) {
      const family = await db.frameworkEditorFrameworkFamily.findUnique({
        where: { id: familyId },
        select: { id: true },
      });
      if (!family) {
        throw new NotFoundException(`Framework family ${familyId} not found`);
      }
    }
    const { count } = await db.frameworkEditorFramework.updateMany({
      where: { id: { in: frameworkIds } },
      data: { familyId },
    });
    this.logger.log(
      `Moved ${count} framework(s) to ${familyId ?? 'root'}`,
    );
    return { count };
  }

  private async getOrThrow(id: string) {
    const family = await db.frameworkEditorFrameworkFamily.findUnique({
      where: { id },
      include: { _count: { select: { frameworks: true } } },
    });
    if (!family) {
      throw new NotFoundException(`Framework family ${id} not found`);
    }
    return family;
  }
}
