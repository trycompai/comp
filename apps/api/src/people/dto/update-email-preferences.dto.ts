import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsNotEmptyObject, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class EmailPreferencesDto {
  @ApiProperty({ example: true })
  @IsBoolean()
  policyNotifications: boolean;

  @ApiProperty({ example: true })
  @IsBoolean()
  taskReminders: boolean;

  @ApiProperty({ example: true })
  @IsBoolean()
  weeklyTaskDigest: boolean;

  @ApiProperty({ example: true })
  @IsBoolean()
  unassignedItemsNotifications: boolean;

  @ApiProperty({ example: true })
  @IsBoolean()
  taskMentions: boolean;

  @ApiProperty({ example: true })
  @IsBoolean()
  taskAssignments: boolean;
}

export class UpdateEmailPreferencesDto {
  @ApiProperty({ type: EmailPreferencesDto })
  @IsNotEmptyObject()
  @ValidateNested()
  @Type(() => EmailPreferencesDto)
  preferences: EmailPreferencesDto;
}
