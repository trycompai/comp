import { ApiProperty } from '@nestjs/swagger';
import {
  IsArray,
  IsEmail,
  IsNotEmpty,
  IsString,
  ValidateNested,
  ArrayMinSize,
} from 'class-validator';
import { Type } from 'class-transformer';

export class InviteItemDto {
  @ApiProperty({ example: 'user@example.com' })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({ example: ['employee'], type: [String] })
  @IsArray()
  @IsString({ each: true })
  @ArrayMinSize(1)
  roles: string[];
}

export class InvitePeopleDto {
  @ApiProperty({ type: [InviteItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => InviteItemDto)
  @ArrayMinSize(1)
  invites: InviteItemDto[];
}
