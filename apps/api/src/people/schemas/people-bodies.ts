import type { ApiBodyOptions } from '@nestjs/swagger';
import { CreatePeopleDto } from '../dto/create-people.dto';
import { UpdatePeopleDto } from '../dto/update-people.dto';
import { BulkCreatePeopleDto } from '../dto/bulk-create-people.dto';

export const PEOPLE_BODIES: Record<string, ApiBodyOptions> = {
  createMember: {
    description: 'Member creation data',
    type: CreatePeopleDto,
  },
  bulkCreateMembers: {
    description: 'Bulk member creation data',
    type: BulkCreatePeopleDto,
  },
  updateMember: {
    description: 'Member update data',
    type: UpdatePeopleDto,
  },
};
