import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  ValidateNested,
  ArrayMinSize,
  ArrayMaxSize,
} from 'class-validator';
import { CreatePeopleDto } from './create-people.dto';

export class BulkCreatePeopleDto {
  @ApiProperty({
    description: 'Array of members to create',
    type: [CreatePeopleDto],
    example: [
      {
        userId: 'usr_abc123def456',
        role: 'admin',
        department: 'it',
        isActive: true,
        fleetDmLabelId: 123,
      },
      {
        userId: 'usr_def456ghi789',
        role: 'member',
        department: 'hr',
        isActive: true,
      },
    ],
  })
  @IsArray()
  @ArrayMinSize(1, { message: 'Members array cannot be empty' })
  @ArrayMaxSize(1000, {
    message: 'Maximum 1000 members allowed per bulk request',
  })
  @ValidateNested({ each: true })
  @Type(() => CreatePeopleDto)
  members: CreatePeopleDto[];
}
